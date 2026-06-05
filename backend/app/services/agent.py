"""Insight agent.

A small explicit loop with four tools: fetch_reviews, compute_metrics
(deterministic, no LLM), summarise_themes (LLM with retries), store_report.
The health score is data-derived so it is always trustworthy; the LLM only
handles the qualitative summary.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AgentReport, Review
from app.services.llm import LLMError, chat_json

logger = logging.getLogger(__name__)
settings = get_settings()

MAX_RETRIES = 3

_SUMMARY_PROMPT = (
    "You are a customer experience analyst. Below are product reviews, each "
    "tagged with its sentiment. Summarise them into actionable business "
    "insights.\n\n"
    "Return STRICT JSON with exactly these keys:\n"
    '  "executive_summary": one or two sentences a manager could read at a glance\n'
    '  "top_complaints": list of short strings (most common negative themes)\n'
    '  "top_praises": list of short strings (most common positive themes)\n'
    '  "recommendations": list of short, concrete action items, most important first\n\n'
    "Reviews:\n{reviews}"
)


# --- Tools -----------------------------------------------------------------

def fetch_reviews(db: Session) -> list[Review]:
    reviews = db.query(Review).all()
    logger.info("agent: fetched %d reviews", len(reviews))
    return reviews


def compute_metrics(reviews: list[Review]) -> dict:
    """Score = % positive + 50% of neutral. Negative weighs 0. Returns 0-100."""
    total = len(reviews)
    counts = {"positive": 0, "negative": 0, "neutral": 0}
    for r in reviews:
        counts[r.sentiment] = counts.get(r.sentiment, 0) + 1

    health_score = (
        round(100 * (counts["positive"] + 0.5 * counts["neutral"]) / total) if total else 0
    )
    percentages = {k: round(100 * v / total) if total else 0 for k, v in counts.items()}
    return {"health_score": health_score, "counts": counts, "percentages": percentages}


def summarise_themes(reviews: list[Review]) -> dict:
    """LLM summary with linear backoff retries."""
    lines = [f"- [{r.sentiment}] {r.review}" for r in reviews]
    prompt = _SUMMARY_PROMPT.format(reviews="\n".join(lines))
    messages = [{"role": "user", "content": prompt}]

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = chat_json(messages, temperature=0.3)
            return {
                "executive_summary": result.get("executive_summary", ""),
                "top_complaints": result.get("top_complaints", []),
                "top_praises": result.get("top_praises", []),
                "recommendations": result.get("recommendations", []),
            }
        except LLMError as exc:
            last_error = exc
            logger.warning("agent: summarise attempt %d failed: %s", attempt, exc)
            time.sleep(attempt)

    raise LLMError(f"summarise_themes failed after {MAX_RETRIES} attempts: {last_error}")


def store_report(db: Session, report: dict) -> str:
    saved_at = datetime.now(timezone.utc).isoformat()

    with open(settings.agent_report_path, "w", encoding="utf-8") as f:
        json.dump({**report, "report_saved_at": saved_at}, f, indent=2)

    # Only the latest report is retained (per spec) - drop previous rows.
    db.query(AgentReport).delete()
    db.add(
        AgentReport(
            executive_summary=report["executive_summary"],
            health_score=report["health_score"],
            top_complaints=report["top_complaints"],
            top_praises=report["top_praises"],
            recommendations=report["recommendations"],
            sentiment_metrics=report["sentiment_metrics"],
        )
    )
    db.commit()
    logger.info("agent: stored report at %s (health=%d)", saved_at, report["health_score"])
    return saved_at


# --- Agent loop ------------------------------------------------------------

def run_agent(db: Session) -> dict:
    reviews = fetch_reviews(db)
    if not reviews:
        raise ValueError("No reviews to analyse - add some via /bulk-analyze first.")

    metrics = compute_metrics(reviews)
    summary = summarise_themes(reviews)

    report = {
        "executive_summary": summary["executive_summary"],
        "health_score": metrics["health_score"],
        "sentiment_metrics": metrics["percentages"],
        "top_complaints": summary["top_complaints"],
        "top_praises": summary["top_praises"],
        "recommendations": summary["recommendations"],
    }
    saved_at = store_report(db, report)
    return {**report, "report_saved_at": saved_at}


def _to_dict(report: AgentReport) -> dict:
    return {
        "executive_summary": report.executive_summary,
        "health_score": report.health_score,
        "sentiment_metrics": report.sentiment_metrics or {},
        "top_complaints": report.top_complaints,
        "top_praises": report.top_praises,
        "recommendations": report.recommendations,
        "report_saved_at": report.created_at.isoformat(),
    }


def get_latest_report(db: Session) -> dict | None:
    report = db.query(AgentReport).order_by(AgentReport.created_at.desc()).first()
    return _to_dict(report) if report else None
