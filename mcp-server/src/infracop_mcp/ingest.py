from __future__ import annotations

import io
import json
import logging
import zipfile
from pathlib import Path

import httpx
from qdrant_client.http import models as qm

from .chunking import chunk_markdown
from .embeddings import get_embeddings
from .retriever import get_client
from .settings import settings

log = logging.getLogger("infracop.ingest")


def ensure_collection() -> None:
    client = get_client()
    names = [c.name for c in client.get_collections().collections]
    if settings.collection in names:
        return
    client.create_collection(
        collection_name=settings.collection,
        vectors_config=qm.VectorParams(
            size=settings.embedding_dims,
            distance=qm.Distance.COSINE,
        ),
    )
    client.create_payload_index(
        collection_name=settings.collection,
        field_name="domain",
        field_schema=qm.PayloadSchemaType.KEYWORD,
    )
    client.create_payload_index(
        collection_name=settings.collection,
        field_name="severity",
        field_schema=qm.PayloadSchemaType.KEYWORD,
    )
    client.create_payload_index(
        collection_name=settings.collection,
        field_name="rule_id",
        field_schema=qm.PayloadSchemaType.KEYWORD,
    )


def fetch_release_zipball(tag: str) -> bytes:
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "infracop-mcp"}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    url = f"https://api.github.com/repos/{settings.standards_repo}/zipball/{tag}"
    with httpx.Client(timeout=60.0, follow_redirects=True) as http:
        res = http.get(url, headers=headers)
        res.raise_for_status()
        return res.content


def markdown_from_zip(blob: bytes) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        for info in zf.infolist():
            name = Path(info.filename).name
            if not name.endswith(".md") or name.lower() == "readme.md":
                continue
            text = zf.read(info).decode("utf-8")
            out.append((name, text))
    return out


def upsert_markdown(files: list[tuple[str, str]], release: str) -> dict:
    ensure_collection()
    embeddings = get_embeddings()
    client = get_client()
    chunks = []
    for filename, markdown in files:
        chunks.extend(chunk_markdown(filename=filename, markdown=markdown, release=release))
    if not chunks:
        return {"upserted": 0, "release": release}

    vectors = embeddings.embed_documents([c.content for c in chunks])
    points = [
        qm.PointStruct(id=c.id, vector=vec, payload=c.payload())
        for c, vec in zip(chunks, vectors, strict=True)
    ]
    client.upsert(collection_name=settings.collection, points=points)
    return {
        "upserted": len(points),
        "release": release,
        "files": [f for f, _ in files],
        "rule_ids": [c.rule_id for c in chunks],
    }


def ingest_release(tag: str) -> dict:
    log.info("ingesting %s from %s", tag, settings.standards_repo)
    blob = fetch_release_zipball(tag)
    files = markdown_from_zip(blob)
    result = upsert_markdown(files, release=tag)
    log.info("ingest complete %s", json.dumps(result))
    return result


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Ingest a GitHub release into Qdrant")
    parser.add_argument("tag")
    args = parser.parse_args()
    print(json.dumps(ingest_release(args.tag), indent=2))


if __name__ == "__main__":
    main()
