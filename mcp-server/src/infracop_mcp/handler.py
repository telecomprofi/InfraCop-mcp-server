from __future__ import annotations

import json
import logging

from mangum import Mangum

from .ingest import process_webhook
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


def handle_ingest(event, context):
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        import base64

        raw = base64.b64decode(body)
    else:
        raw = body.encode() if isinstance(body, str) else body
    status, payload = process_webhook(headers, raw)
    return {"statusCode": status, "body": json.dumps(payload)}
