from __future__ import annotations

import hashlib
import hmac
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
        try:
            info = client.get_collection(settings.collection)
            vectors = info.config.params.vectors
            size = vectors.size if hasattr(vectors, "size") else None
            if size and size != settings.embedding_dims:
                log.warning(
                    "recreating %s (dim %s -> %s)",
                    settings.collection,
                    size,
                    settings.embedding_dims,
                )
                client.delete_collection(settings.collection)
            else:
                return
        except Exception:
            return
    client.create_collection(
        collection_name=settings.collection,
        vectors_config=qm.VectorParams(
            size=settings.embedding_dims,
            distance=qm.Distance.COSINE,
        ),
    )
    for field in ("domain", "severity", "rule_id"):
        client.create_payload_index(
            collection_name=settings.collection,
            field_name=field,
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


def markdown_from_dir(path: Path) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    root = Path(path)
    for p in sorted(root.rglob("*.md")):
        if p.name.lower() == "readme.md":
            continue
        out.append((p.name, p.read_text(encoding="utf-8")))
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


def ingest_directory(path: Path, release: str = "local") -> dict:
    files = markdown_from_dir(path)
    log.info("ingesting %s files from %s", len(files), path)
    result = upsert_markdown(files, release=release)
    log.info("ingest complete %s", json.dumps(result))
    return result


def valid_signature(secret: str, body: bytes, header: str) -> bool:
    if not secret:
        return True
    if not header.startswith("sha256="):
        return False
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={digest}", header)


def process_webhook(headers: dict[str, str], body: bytes) -> tuple[int, dict]:
    headers = {k.lower(): v for k, v in headers.items()}
    if not valid_signature(
        settings.github_webhook_secret, body, headers.get("x-hub-signature-256", "")
    ):
        return 401, {"error": "bad signature"}

    event_name = headers.get("x-github-event", "")
    if event_name == "ping":
        return 200, {"pong": True}

    payload: dict = {}
    if body:
        try:
            payload = json.loads(body.decode() or "{}")
        except json.JSONDecodeError:
            return 400, {"error": "invalid json"}

    if event_name == "release":
        if payload.get("action") != "published":
            return 202, {"ignored": event_name, "action": payload.get("action")}
        tag = (payload.get("release") or {}).get("tag_name")
        if not tag:
            return 400, {"error": "missing tag"}
        return 200, ingest_release(tag)

    if payload.get("tag"):
        return 200, ingest_release(str(payload["tag"]))
    if payload.get("dir"):
        return 200, ingest_directory(Path(payload["dir"]), str(payload.get("release") or "local"))
    if event_name:
        return 202, {"ignored": event_name, "action": payload.get("action")}
    return 400, {"error": "expected github release, or JSON {tag} / {dir}"}


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Ingest standards into Qdrant")
    parser.add_argument("tag", nargs="?", help="GitHub release tag (e.g. v1.0.0)")
    parser.add_argument("--dir", dest="directory", help="Local directory of .md files")
    parser.add_argument("--release", default="local", help="Release label when using --dir")
    args = parser.parse_args()
    if args.directory:
        result = ingest_directory(Path(args.directory), args.release)
    elif args.tag:
        result = ingest_release(args.tag)
    else:
        parser.error("provide a GitHub tag or --dir")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
