from __future__ import annotations

import logging

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from .ingest import process_webhook
from .settings import settings

log = logging.getLogger("infracop.ingest-http")


async def health(_request: Request) -> JSONResponse:
    return JSONResponse(
        {
            "status": "ok",
            "service": "infracop-ingest",
            "collection": settings.collection,
            "qdrant": settings.qdrant_url,
        }
    )


async def ingest_route(request: Request) -> JSONResponse:
    body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}
    status, payload = process_webhook(headers, body)
    return JSONResponse(payload, status_code=status)


def ingest_app() -> Starlette:
    return Starlette(
        routes=[
            Route("/health", health, methods=["GET"]),
            Route("/ingest", ingest_route, methods=["POST"]),
        ]
    )


def main_ingest() -> None:
    import uvicorn

    uvicorn.run(
        "infracop_mcp.local_http:ingest_app",
        factory=True,
        host=settings.host,
        port=settings.ingest_port,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main_ingest()
