from __future__ import annotations

from functools import lru_cache

from langchain_aws import BedrockEmbeddings

from .settings import settings


@lru_cache(maxsize=1)
def get_embeddings() -> BedrockEmbeddings:
    """Titan Text Embeddings V2 — stays in AWS, Matryoshka 1024-d, 8k context."""
    return BedrockEmbeddings(
        model_id=settings.embedding_model,
        region_name=settings.bedrock_region,
        model_kwargs={"dimensions": settings.embedding_dims, "normalize": True},
    )
