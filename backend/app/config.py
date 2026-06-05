"""Settings loaded from .env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    llm_model_name: str = "meta-llama/llama-3.3-70b-instruct:free"
    app_url: str = "http://localhost:3000"
    app_name: str = "Smart Review Intelligence"

    # "vader" or "llm". llm mode falls back to vader if the call fails.
    sentiment_backend: str = "vader"

    embedding_backend: str = "auto"  # auto | sentence-transformers | fastembed
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    retrieval_threshold: float = 0.35
    retrieval_top_k: int = 4

    database_url: str = "sqlite:///./reviews.db"
    faiss_index_path: str = "./faiss_index.bin"
    agent_report_path: str = "./agent_report.json"

    allowed_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
