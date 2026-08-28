from __future__ import annotations

import math
import re
from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.http import models as qm

from .embeddings import get_embeddings
from .settings import settings

STOP = {
    "the", "a", "an", "and", "or", "of", "to", "for", "in", "on", "with", "by",
    "is", "are", "be", "as", "that", "this", "it", "from", "at", "how", "what",
}

SYNONYMS = {
    "tag": ["tags", "tagging", "label", "common_tags"],
    "naming": ["name", "convention", "kebab"],
    "rds": ["database", "postgres", "rds-db"],
    "env": ["environment", "uat", "staging", "prod"],
    "datadog": ["observability", "monitoring"],
    "opa": ["conftest", "policy", "rego"],
}


@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None, timeout=8.0)


def _tokens(text: str) -> list[str]:
    parts = re.sub(r"[^a-z0-9:_./-]+", " ", text.lower()).split()
    return [p for p in parts if len(p) > 1 and p not in STOP]


def _expand(terms: list[str]) -> list[str]:
    extra: list[str] = []
    for t in terms:
        extra.extend(SYNONYMS.get(t, []))
    return list(dict.fromkeys([*terms, *extra]))


def _bm25(query: list[str], doc: str, avgdl: float = 180.0) -> float:
    body = _tokens(doc)
    if not body:
        return 0.0
    k1, b = 1.2, 0.75
    score = 0.0
    for term in query:
        f = body.count(term)
        if not f:
            continue
        idf = math.log(1 + 12 / 1.5)
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * (len(body) / avgdl)))
    return score


def retrieve(
    query: str,
    *,
    domain: str | None = None,
    severity: str | None = None,
    limit: int = 5,
) -> list[dict]:
    embeddings = get_embeddings()
    vector = embeddings.embed_query(query)
    must = []
    if domain and domain != "all":
        must.append(qm.FieldCondition(key="domain", match=qm.MatchValue(value=domain)))
    if severity and severity != "all":
        must.append(qm.FieldCondition(key="severity", match=qm.MatchValue(value=severity)))
    flt = qm.Filter(must=must) if must else None

    hits = get_client().query_points(
        collection_name=settings.collection,
        query=vector,
        query_filter=flt,
        limit=max(limit * 3, 8),
        with_payload=True,
    )

    terms = _expand(_tokens(query))
    ranked: list[tuple[float, dict]] = []
    for point in hits.points:
        payload = dict(point.payload or {})
        text = f"{payload.get('heading', '')}\n{payload.get('content', '')}"
        lexical = _bm25(terms, text)
        fused = float(point.score or 0) * 0.7 + lexical * 0.3
        ranked.append((fused, {**payload, "vector_score": point.score, "fused_score": fused}))
    ranked.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in ranked[:limit]]
