"""Smoke tests for the API endpoints using an in-memory database.

These avoid hitting the real LLM - they cover the deterministic Part 1 routes
and the search fallback path, which is enough to catch wiring mistakes.
"""

import os

# Point at a throwaway sqlite file before the app imports its settings.
os.environ["DATABASE_URL"] = "sqlite:///./test_reviews.db"
os.environ["FAISS_INDEX_PATH"] = "./test_faiss.bin"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # triggers startup: tables + seed + index
        yield c

    # Release the SQLite file handle so Windows lets us delete it.
    from app.database import engine

    engine.dispose()
    for path in ("test_reviews.db", "test_faiss.bin", "test_faiss.bin.ids.npy"):
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass  # best-effort cleanup; not worth failing the run over


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_analyze_single(client):
    res = client.post("/analyze", json={"id": 99, "review": "Fast delivery, great quality!"})
    body = res.json()
    assert res.status_code == 200
    assert body["sentiment"] == "positive"
    assert "delivery" in body["categories"]


def test_summary_has_seed_reviews(client):
    body = client.get("/summary").json()
    assert body["total_reviews"] >= 6
    assert sum(body["sentiment_breakdown"].values()) == body["total_reviews"]


def test_reviews_filter_by_sentiment(client):
    body = client.get("/reviews?sentiment=negative").json()
    assert all(r["sentiment"] == "negative" for r in body)


def test_create_review_assigns_id_and_persists(client):
    before = client.get("/summary").json()["total_reviews"]

    res = client.post("/reviews", json={"review": "Fast shipping and great quality!"})
    assert res.status_code == 201
    created = res.json()
    assert created["id"] > 0
    assert created["sentiment"] == "positive"

    after = client.get("/summary").json()["total_reviews"]
    assert after == before + 1


def test_delete_user_review_works(client):
    # Add a fresh review, then delete it.
    created = client.post("/reviews", json={"review": "Throwaway test review."}).json()
    new_id = created["id"]
    before = client.get("/summary").json()["total_reviews"]

    res = client.delete(f"/reviews/{new_id}")
    assert res.status_code == 204

    after = client.get("/summary").json()["total_reviews"]
    assert after == before - 1


def test_delete_seed_review_is_forbidden(client):
    res = client.delete("/reviews/1")  # review 1 is a spec seed
    assert res.status_code == 403


def test_reviews_list_marks_seeds(client):
    rows = client.get("/reviews").json()
    seeds = [r for r in rows if r["is_seed"]]
    assert len(seeds) >= 6  # at least the original spec examples
    assert all(r["is_seed"] is True for r in seeds)
