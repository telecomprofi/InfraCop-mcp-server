from __future__ import annotations

import hashlib
import math
from functools import lru_cache

from .settings import settings


class HashEmbeddings:
    """Deterministic bag-of-tokens vectors. No AWS, no model download.

    Good enough to wire ingest → Qdrant → retrieve locally. Not for production quality.
    """

    def __init__(self, dims: int | None = None):
        self.dims = dims or settings.embedding_dims

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)

    def _embed(self, text: str) -> list[float]:
        vec = [0.0] * self.dims
        for tok in text.lower().split():
            if len(tok) < 2:
                continue
            h = int(hashlib.sha256(tok.encode()).hexdigest(), 16)
            vec[h % self.dims] += 1.0
            vec[(h >> 11) % self.dims] += 0.35
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]


class FastEmbedAdapter:
    def __init__(self):
        from fastembed import TextEmbedding

        self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        self.dims = 384

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [list(map(float, v)) for v in self.model.embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        return list(map(float, next(self.model.embed([text]))))


@lru_cache(maxsize=1)
def get_embeddings():
    backend = (settings.embedding_backend or "bedrock").lower()
    if backend == "hash":
        return HashEmbeddings(settings.embedding_dims)
    if backend == "fastembed":
        return FastEmbedAdapter()
    from langchain_aws import BedrockEmbeddings

    return BedrockEmbeddings(
        model_id=settings.embedding_model,
        region_name=settings.bedrock_region,
        model_kwargs={"dimensions": settings.embedding_dims, "normalize": True},
    )
