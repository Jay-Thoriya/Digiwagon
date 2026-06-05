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
from app.services.llm import LLMError, chat

logger = logging.getLogger(__name__)
settings = get_settings()

EMBED_DIM = 384  # all-MiniLM-L6-v2


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


_PROMPT = (
    "You are a review analyst. Answer the user's question using ONLY the "
    "reviews provided below. If the reviews do not contain the answer, say "
    "you don't have enough information. Be concise and cite review ids like "
    "(review 3) when relevant.\n\n"
    "Reviews:\n{context}\n\nQuestion: {query}"
)


def semantic_search(db: Session, query: str) -> dict:
    hits = review_index.search(query, settings.retrieval_top_k)
    relevant = [(rid, score) for rid, score in hits if score >= settings.retrieval_threshold]

    if not relevant:
        return {
            "answer": "No relevant reviews were found for this query.",
            "source_review_ids": [],
            "retrieved_reviews": [],
        }

    ids = [rid for rid, _ in relevant]
    rows = db.query(Review).filter(Review.id.in_(ids)).all()
    by_id = {r.id: r for r in rows}
    ordered = [by_id[rid] for rid in ids if rid in by_id]

    context = "\n".join(f"(review {r.id}) {r.review}" for r in ordered)
    messages = [{"role": "user", "content": _PROMPT.format(context=context, query=query)}]

    try:
        answer = chat(messages).strip()
    except LLMError as exc:
        # Degrade gracefully: still return the retrieved reviews.
        logger.warning("LLM answer generation failed: %s", exc)
        answer = "Could not generate an answer right now, but here are the most relevant reviews."

    return {
        "answer": answer,
        "source_review_ids": [r.id for r in ordered],
        "retrieved_reviews": [{"id": r.id, "review": r.review} for r in ordered],
    }
