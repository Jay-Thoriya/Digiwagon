"""Unit tests for the agent's deterministic health-score logic (no LLM)."""

from types import SimpleNamespace

from app.services.agent import compute_metrics


def _reviews(positive: int, negative: int, neutral: int):
    rows = []
    rows += [SimpleNamespace(sentiment="positive")] * positive
    rows += [SimpleNamespace(sentiment="negative")] * negative
    rows += [SimpleNamespace(sentiment="neutral")] * neutral
    return rows


def test_all_positive_scores_100():
    metrics = compute_metrics(_reviews(4, 0, 0))
    assert metrics["health_score"] == 100
    assert metrics["percentages"]["positive"] == 100


def test_all_negative_scores_0():
    assert compute_metrics(_reviews(0, 3, 0))["health_score"] == 0


def test_neutral_counts_half():
    # 2 positive + 2 neutral out of 4 -> (2 + 1) / 4 = 75
    assert compute_metrics(_reviews(2, 0, 2))["health_score"] == 75


def test_empty_is_zero_not_crash():
    metrics = compute_metrics([])
    assert metrics["health_score"] == 0
    assert metrics["counts"]["positive"] == 0
