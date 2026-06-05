"""Request and response models."""

from pydantic import BaseModel, Field


class ReviewIn(BaseModel):
    id: int
    review: str = Field(min_length=1)


class ReviewCreate(BaseModel):
    review: str = Field(min_length=1)


class BulkReviewsIn(BaseModel):
    reviews: list[ReviewIn]


class AnalysisOut(BaseModel):
    id: int
    review: str
    sentiment: str
    confidence: float
    categories: list[str]
    # The UI hides the delete button when this is True.
    is_seed: bool = False


class CategoryCount(BaseModel):
    category: str
    count: int


class SummaryOut(BaseModel):
    total_reviews: int
    sentiment_breakdown: dict[str, int]
    top_categories: list[CategoryCount]


class SearchIn(BaseModel):
    query: str = Field(min_length=1)


class RetrievedReview(BaseModel):
    id: int
    review: str


class SearchOut(BaseModel):
    answer: str
    source_review_ids: list[int]
    retrieved_reviews: list[RetrievedReview]


class AgentReportOut(BaseModel):
    executive_summary: str
    health_score: int
    sentiment_metrics: dict[str, int]
    top_complaints: list[str]
    top_praises: list[str]
    recommendations: list[str]
    report_saved_at: str
