"""Embedding model wrapper.

Both backends emit the same 384-dim all-MiniLM-L6-v2 vectors:
  - sentence-transformers: standard, heavier (pulls in torch). Used locally.
  - fastembed (ONNX): ~10x smaller. Used in deployment (fits a 512MB free tier).
"""

from __future__ import annotations

import logging

import numpy as np

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class Embedder:
    def __init__(self) -> None:
        self._backend = self._pick_backend()
        self._model = None  # lazy-loaded on first encode()
        logger.info("Using embedding backend: %s", self._backend)

    def _pick_backend(self) -> str:
        choice = settings.embedding_backend.lower()
        if choice in ("sentence-transformers", "fastembed"):
            return choice
        try:
            import sentence_transformers  # noqa: F401
            return "sentence-transformers"
        except ImportError:
            return "fastembed"

    def _load(self) -> None:
        if self._model is not None:
            return
        if self._backend == "sentence-transformers":
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(settings.embedding_model_name)
        else:
            from fastembed import TextEmbedding
            self._model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

    def encode(self, texts: list[str]) -> np.ndarray:
        self._load()
        if self._backend == "sentence-transformers":
            vectors = self._model.encode(texts, convert_to_numpy=True)
        else:
            vectors = np.array(list(self._model.embed(texts)))
        return vectors.astype("float32")


embedder = Embedder()
