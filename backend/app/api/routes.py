"""HTTP endpoints, grouped by part of the assessment."""

from collections import Counter

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.models import Review
from app.seed import SEED_IDS
from app.services import agent
from app.services.rag import review_index, semantic_search
from app.services.sentiment import analyze_review, analyze_reviews

router = APIRouter()


# --- Part 1: review analysis ----------------------------------------------

@router.post("/analyze", response_model=schemas.AnalysisOut, tags=["Part 1"])
def analyze(payload: schemas.ReviewIn):
    return analyze_review(payload.id, payload.review)


@router.post("/bulk-analyze", response_model=list[schemas.AnalysisOut], tags=["Part 1"])
def bulk_analyze(
    payload: schemas.BulkReviewsIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # One batched call - matters when SENTIMENT_BACKEND=llm.
    results = analyze_reviews([{"id": r.id, "review": r.review} for r in payload.reviews])
    for result in results:
        # merge() lets callers re-send an existing id without crashing.
        db.merge(Review(**result))
    db.commit()
    background_tasks.add_task(_reindex)
    return results


@router.post("/reviews", response_model=schemas.AnalysisOut, status_code=201, tags=["Part 1"])
def create_review(
    payload: schemas.ReviewCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    max_id = db.query(func.max(Review.id)).scalar() or 0
    result = analyze_review(max_id + 1, payload.review)
    db.add(Review(**result))
    db.commit()
    background_tasks.add_task(_reindex)
    return result


def _reindex() -> None:
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        review_index.rebuild(db.query(Review).all())
        review_index.save()
    finally:
        db.close()


@router.get("/summary", response_model=schemas.SummaryOut, tags=["Part 1"])
def summary(db: Session = Depends(get_db)):
    reviews = db.query(Review).all()

    sentiment_breakdown = {"positive": 0, "negative": 0, "neutral": 0}
    category_counter: Counter[str] = Counter()
    for r in reviews:
        sentiment_breakdown[r.sentiment] = sentiment_breakdown.get(r.sentiment, 0) + 1
        category_counter.update(r.categories or [])

    return {
        "total_reviews": len(reviews),
        "sentiment_breakdown": sentiment_breakdown,
        "top_categories": [
            {"category": name, "count": count}
            for name, count in category_counter.most_common()
        ],
    }


@router.get("/reviews", response_model=list[schemas.AnalysisOut], tags=["Part 1"])
def list_reviews(
    sentiment: str | None = Query(default=None),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Review)
    if sentiment:
        query = query.filter(Review.sentiment == sentiment)
    rows = query.all()

    # Category is a JSON list; filter in Python so it works on any DB backend.
    if category:
        rows = [r for r in rows if category in (r.categories or [])]

    return [
        {
            "id": r.id,
            "review": r.review,
            "sentiment": r.sentiment,
            "confidence": r.confidence,
            "categories": r.categories or [],
            "is_seed": r.id in SEED_IDS,
        }
        for r in rows
    ]


@router.delete("/reviews/{review_id}", status_code=204, tags=["Part 1"])
def delete_review(
    review_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if review_id in SEED_IDS:
        raise HTTPException(
            status_code=403,
            detail="Seed reviews are protected so the demo dataset stays intact.",
        )
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail=f"Review {review_id} not found.")

    db.delete(review)
    db.commit()
    background_tasks.add_task(_reindex)


# --- Part 2: semantic search ----------------------------------------------

@router.post("/search", response_model=schemas.SearchOut, tags=["Part 2"])
def search(payload: schemas.SearchIn, db: Session = Depends(get_db)):
    return semantic_search(db, payload.query)


# --- Part 3: AI agent ------------------------------------------------------

@router.post("/agent/run", response_model=schemas.AgentReportOut, tags=["Part 3"])
def agent_run(db: Session = Depends(get_db)):
    try:
        return agent.run_agent(db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent failed: {exc}") from exc


@router.get("/agent/report", response_model=schemas.AgentReportOut, tags=["Part 3"])
def agent_report(db: Session = Depends(get_db)):
    report = agent.get_latest_report(db)
    if report is None:
        raise HTTPException(status_code=404, detail="No report has been generated yet.")
    return report


@router.get("/agent/reports", response_model=list[schemas.AgentReportOut], tags=["Part 3"])
def agent_reports(db: Session = Depends(get_db)):
    return agent.get_report_history(db)
