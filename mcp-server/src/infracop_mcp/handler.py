from __future__ import annotations

import hashlib
import hmac
import json
import logging

from mangum import Mangum

from .ingest import ingest_release
from .server import asgi_app
from .settings import settings

log = logging.getLogger("infracop.handler")

mcp_asgi = asgi_app()
mcp_handler = Mangum(mcp_asgi, lifespan="off")


def _authorize(event: dict) -> bool:
    keys = settings.api_key_set
    if not keys:
        return True
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    auth = headers.get("authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    api_key = headers.get("x-api-key", "")
    return token in keys or api_key in keys


def handle_mcp(event, context):
    if event.get("rawPath") in {"/health", "/mcp/health"} or event.get("path") == "/health":
        return {
            "statusCode": 200,
            "headers": {"content-type": "application/json"},
            "body": json.dumps({"status": "ok", "service": "infracop-mcp"}),
        }
    if not _authorize(event):
        return {"statusCode": 401, "body": json.dumps({"error": "unauthorized"})}
    return mcp_handler(event, context)


def _valid_signature(secret: str, body: bytes, header: str) -> bool:
    if not secret:
        return True
    if not header.startswith("sha256="):
        return False
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={digest}", header)


def handle_ingest(event, context):
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        import base64

        raw = base64.b64decode(body)
    else:
        raw = body.encode() if isinstance(body, str) else body

    if not _valid_signature(settings.github_webhook_secret, raw, headers.get("x-hub-signature-256", "")):
        return {"statusCode": 401, "body": json.dumps({"error": "bad signature"})}

    event_name = headers.get("x-github-event", "")
    payload = json.loads(raw.decode() or "{}")
    if event_name == "ping":
        return {"statusCode": 200, "body": json.dumps({"pong": True})}
    if event_name != "release" or payload.get("action") != "published":
        return {"statusCode": 202, "body": json.dumps({"ignored": event_name, "action": payload.get("action")})}

    tag = (payload.get("release") or {}).get("tag_name")
    if not tag:
        return {"statusCode": 400, "body": json.dumps({"error": "missing tag"})}
    result = ingest_release(tag)
    return {"statusCode": 200, "body": json.dumps(result)}
