"""Sentiment scoring and category detection.

Two backends, picked by SENTIMENT_BACKEND: "vader" (default, offline, fast)
or "llm" (batched OpenRouter call, falls back to VADER on failure).
"""

import logging

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from app.config import get_settings
from app.services.llm import LLMError, chat_json

logger = logging.getLogger(__name__)
settings = get_settings()

_analyzer = SentimentIntensityAnalyzer()

# A review can match several categories at once. Keep the keyword lists short
# and obvious - this is meant to be read and tweaked by a human.
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "product_quality": ["quality", "excellent", "great", "poor", "defective",
                        "broken", "works", "durable", "cheap", "material"],
    "delivery": ["delivery", "delivered", "shipping", "shipped", "arrived",
                 "late", "delayed", "fast", "slow", "courier"],
    "packaging": ["packaging", "package", "packed", "box", "wrapped", "damaged",
                  "sealed"],
    "price": ["price", "expensive", "cheap", "value", "worth", "overpriced",
              "affordable", "money"],
    "customer_support": ["support", "service", "help", "response", "refund",
                         "replacement", "contacted", "staff"],
    "usability": ["instructions", "manual", "easy", "difficult", "confusing",
                  "setup", "install", "unclear", "intuitive"],
}


# VADER misses some common emojis (a bare 👍 scores neutral, 😡💔 scores positive).
# Expanding to plain words before scoring fixes those cases - still microsecond-fast.
SYMBOL_WORDS: dict[str, str] = {
    "👍": " good ", "👎": " bad ", "🔥": " amazing ", "💯": " excellent ",
    "❤️": " love ", "❤": " love ", "😍": " love ", "🤩": " amazing ",
    "🙂": " good ", "😊": " happy ", "😀": " happy ", "😁": " happy ",
    "👌": " great ", "⭐": " great ", "🌟": " great ", "🎉": " great ",
    "😡": " angry ", "😠": " angry ", "🤬": " furious ", "💔": " heartbroken ",
    "😞": " disappointed ", "😢": " sad ", "😭": " terrible ",
    "🤮": " disgusting ", "😤": " frustrated ", "😕": " unhappy ", "💩": " awful ",
}


def _expand_symbols(text: str) -> str:
    expanded = text
    for symbol, word in SYMBOL_WORDS.items():
        if symbol in expanded:
            expanded = expanded.replace(symbol, word)
    return expanded


def detect_sentiment(text: str) -> tuple[str, float]:
    """VADER compound score -> (label, confidence in [0, 1])."""
    compound = _analyzer.polarity_scores(_expand_symbols(text))["compound"]

    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"

    # For neutral, report distance-from-decision instead of raw magnitude.
    confidence = round(abs(compound), 2) if label != "neutral" else round(1 - abs(compound), 2)
    return label, confidence


def detect_categories(text: str) -> list[str]:
    lowered = text.lower()
    return [
        category
        for category, keywords in CATEGORY_KEYWORDS.items()
        if any(word in lowered for word in keywords)
    ]


CATEGORY_NAMES = list(CATEGORY_KEYWORDS)


def _analyze_with_vader(review_id: int, text: str) -> dict:
    sentiment, confidence = detect_sentiment(text)
    return {
        "id": review_id,
        "review": text,
        "sentiment": sentiment,
        "confidence": confidence,
        "categories": detect_categories(text),
    }


def _use_llm() -> bool:
    return settings.sentiment_backend.lower() == "llm" and bool(settings.openrouter_api_key)


def _analyze_with_llm(items: list[dict]) -> list[dict]:
    """Classify a batch of reviews in one LLM call. Order matches `items`."""
    numbered = "\n".join(f'{i["id"]}: {i["review"]}' for i in items)
    prompt = (
        "Classify each customer review below. Respond with STRICT JSON: "
        '{"results": [{"id": <int>, "sentiment": "positive|negative|neutral", '
        '"confidence": <0..1>, "categories": [<from the allowed list>]}]}.\n'
        f"Allowed categories: {', '.join(CATEGORY_NAMES)}.\n"
        "Only use categories that are clearly relevant.\n\n"
        f"Reviews:\n{numbered}"
    )
    data = chat_json([{"role": "user", "content": prompt}])
    by_id = {r["id"]: r for r in data.get("results", [])}

    results = []
    for item in items:
        row = by_id.get(item["id"])
        if not row:
            results.append(_analyze_with_vader(item["id"], item["review"]))
            continue
        results.append(
            {
                "id": item["id"],
                "review": item["review"],
                "sentiment": row.get("sentiment", "neutral"),
                "confidence": round(min(max(float(row.get("confidence", 0.5)), 0.0), 1.0), 2),
                "categories": [c for c in row.get("categories", []) if c in CATEGORY_NAMES],
            }
        )
    return results


def analyze_reviews(items: list[dict]) -> list[dict]:
    if _use_llm():
        try:
            return _analyze_with_llm(items)
        except (LLMError, KeyError, ValueError, TypeError) as exc:
            logger.warning("LLM sentiment failed, falling back to VADER: %s", exc)
    return [_analyze_with_vader(i["id"], i["review"]) for i in items]


def analyze_review(review_id: int, text: str) -> dict:
    return analyze_reviews([{"id": review_id, "review": text}])[0]
