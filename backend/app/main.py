"""FastAPI entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import Review
from app.seed import seed_reviews
from app.services.rag import review_index

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger("app")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seeded = seed_reviews(db)
        if seeded:
            logger.info("Seeded %d example reviews", len(seeded))

        if not review_index.load():
            review_index.rebuild(db.query(Review).all())
            review_index.save()
    finally:
        db.close()

    yield


app = FastAPI(
    title="Smart Review Intelligence Platform",
    description="Sentiment analysis, semantic search (RAG) and an insight agent.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["Meta"], methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}
