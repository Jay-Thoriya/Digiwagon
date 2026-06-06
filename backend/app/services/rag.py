"""Semantic search: FAISS retrieval + grounded LLM answer.

Cosine similarity = L2-normalised vectors + IndexFlatIP (inner product).
Reviews below RETRIEVAL_THRESHOLD are dropped to keep the LLM grounded.
"""

from __future__ import annotations

import logging
import os

import faiss
import numpy as np
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Review
from app.services.embeddings import embedder
from app.services.llm import LLMError, chat, chat_json

logger = logging.getLogger(__name__)
settings = get_settings()

EMBED_DIM = 384  # all-MiniLM-L6-v2

VALID_SENTIMENTS = {"positive", "negative", "neutral"}
VALID_CATEGORIES = {
    "product_quality", "delivery", "packaging",
    "price", "customer_support", "usability",
}


class ReviewIndex:
    """FAISS index that maps vector rows back to review ids."""

    def __init__(self) -> None:
        self.index = faiss.IndexFlatIP(EMBED_DIM)
        self.review_ids: list[int] = []

    def _normalise(self, vectors: np.ndarray) -> np.ndarray:
        faiss.normalize_L2(vectors)
        return vectors

    def rebuild(self, reviews: list[Review]) -> None:
        self.index = faiss.IndexFlatIP(EMBED_DIM)
        self.review_ids = []
        if not reviews:
            return
        vectors = self._normalise(embedder.encode([r.review for r in reviews]))
        self.index.add(vectors)
        self.review_ids = [r.id for r in reviews]
        logger.info("Built review index with %d vectors", len(self.review_ids))

    def search(self, query: str, top_k: int) -> list[tuple[int, float]]:
        if self.index.ntotal == 0:
            return []
        query_vec = self._normalise(embedder.encode([query]))
        scores, positions = self.index.search(query_vec, min(top_k, self.index.ntotal))
        return [
            (self.review_ids[pos], float(score))
            for score, pos in zip(scores[0], positions[0])
            if pos != -1
        ]

    def save(self) -> None:
        faiss.write_index(self.index, settings.faiss_index_path)
        np.save(settings.faiss_index_path + ".ids.npy", np.array(self.review_ids))

    def load(self) -> bool:
        ids_path = settings.faiss_index_path + ".ids.npy"
        if not (os.path.exists(settings.faiss_index_path) and os.path.exists(ids_path)):
            return False
        self.index = faiss.read_index(settings.faiss_index_path)
        self.review_ids = np.load(ids_path).tolist()
        logger.info("Loaded review index with %d vectors", len(self.review_ids))
        return True


review_index = ReviewIndex()


_ANSWER_PROMPT = (
    "You are a review analyst. Answer the user's question using ONLY the "
    "reviews provided below. If the reviews do not contain the answer, say "
    "you don't have enough information. Be concise and cite review ids like "
    "(review 3) when relevant.\n\n"
    "Reviews:\n{context}\n\nQuestion: {query}"
)

def _build_parse_prompt(query: str) -> str:
    """Compose the parser prompt. f-string keeps literal JSON braces intact."""
    cats = sorted(VALID_CATEGORIES)
    return (
        "Parse a customer-review search query into structured filters. Return "
        "STRICT JSON with exactly these keys:\n"
        '  "sentiment": one of "positive" | "negative" | "neutral" | null  '
        "(null if no sentiment is requested)\n"
        f'  "categories": array containing any of {cats} (empty array if none apply)\n'
        '  "semantic_query": a short search phrase suitable for semantic '
        "similarity search over review text, or empty string if the user only "
        "wants a filter (e.g. 'show me all negative reviews').\n\n"
        "Examples:\n"
        '  "show me bad reviews" -> {"sentiment":"negative","categories":[],"semantic_query":""}\n'
        '  "any delivery delays?" -> {"sentiment":null,"categories":["delivery"],"semantic_query":"delivery was delayed or shipping was slow"}\n'
        '  "what do customers love?" -> {"sentiment":"positive","categories":[],"semantic_query":"positive customer feedback"}\n'
        '  "is the price good?" -> {"sentiment":null,"categories":["price"],"semantic_query":"value for money and pricing"}\n\n'
        f'Query: "{query}"'
    )


def _parse_query(query: str) -> dict:
    """Ask the LLM to split a natural-language query into filters + a search phrase.

    Falls back to a plain semantic search of the raw query if the LLM call
    fails or returns malformed JSON.
    """
    try:
        result = chat_json([{"role": "user", "content": _build_parse_prompt(query)}])
        sentiment = result.get("sentiment")
        if sentiment not in VALID_SENTIMENTS:
            sentiment = None
        categories = [c for c in (result.get("categories") or []) if c in VALID_CATEGORIES]
        return {
            "sentiment": sentiment,
            "categories": categories,
            "semantic_query": (result.get("semantic_query") or "").strip(),
        }
    except (LLMError, KeyError, TypeError, ValueError) as exc:
        logger.info("Query parse failed (%s) - falling back to raw semantic search", exc)
        return {"sentiment": None, "categories": [], "semantic_query": query}


def _rank_by_similarity(query: str, candidates: list[Review]) -> list[tuple[Review, float]]:
    """Cosine-rank a candidate list against a query. Returns [(review, score), ...]."""
    if not candidates or not query:
        return []
    cand_vecs = embedder.encode([r.review for r in candidates])
    faiss.normalize_L2(cand_vecs)
    query_vec = embedder.encode([query])
    faiss.normalize_L2(query_vec)
    scores = (cand_vecs @ query_vec.T).flatten()
    return sorted(zip(candidates, scores.tolist()), key=lambda x: x[1], reverse=True)


def _empty_result() -> dict:
    return {
        "answer": "No relevant reviews were found for this query.",
        "source_review_ids": [],
        "retrieved_reviews": [],
    }


def semantic_search(db: Session, query: str) -> dict:
    parsed = _parse_query(query)
    logger.info(
        "search parse: sentiment=%s categories=%s semantic=%r",
        parsed["sentiment"], parsed["categories"], parsed["semantic_query"],
    )

    # 1. Narrow the candidate set by any structured filters the LLM extracted.
    q = db.query(Review)
    if parsed["sentiment"]:
        q = q.filter(Review.sentiment == parsed["sentiment"])
    candidates = q.all()
    if parsed["categories"]:
        wanted = set(parsed["categories"])
        candidates = [r for r in candidates if wanted & set(r.categories or [])]

    if not candidates:
        return _empty_result()

    # 2. Decide how to pick the final set.
    has_filter = bool(parsed["sentiment"] or parsed["categories"])
    if parsed["semantic_query"] and has_filter:
        # Filter already narrowed the set - use similarity just to rank, no threshold.
        ranked = _rank_by_similarity(parsed["semantic_query"], candidates)
        ordered = [r for r, _ in ranked[:settings.retrieval_top_k]]
    elif parsed["semantic_query"]:
        # Pure semantic search - apply threshold to guard against weak matches.
        ranked = _rank_by_similarity(parsed["semantic_query"], candidates)
        above = [(r, s) for r, s in ranked if s >= settings.retrieval_threshold]
        ordered = [r for r, _ in above[:settings.retrieval_top_k]]
        if not ordered:
            return _empty_result()
    else:
        # Pure filter query (e.g. "show me bad reviews") - keep all matches.
        ordered = candidates[:settings.retrieval_top_k]

    # 3. Ask the LLM to compose a grounded answer over the retrieved set.
    context = "\n".join(f"(review {r.id}) {r.review}" for r in ordered)
    messages = [{"role": "user", "content": _ANSWER_PROMPT.format(context=context, query=query)}]
    try:
        answer = chat(messages).strip()
    except LLMError as exc:
        logger.warning("LLM answer generation failed: %s", exc)
        answer = "Could not generate an answer right now, but here are the most relevant reviews."

    return {
        "answer": answer,
        "source_review_ids": [r.id for r in ordered],
        "retrieved_reviews": [{"id": r.id, "review": r.review} for r in ordered],
    }
