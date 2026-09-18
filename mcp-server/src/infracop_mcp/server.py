from __future__ import annotations

import json
import logging

from mcp.server.fastmcp import FastMCP
from starlette.routing import Route
from starlette.responses import JSONResponse

from .instructions import INFRACOP_INSTRUCTIONS, PRECEDENCE_HEADER
from .retriever import retrieve
from .settings import settings
from .validator import MANDATORY_TAGS, PROVIDER_DEFAULT_TAGS, validate_terraform

logging.basicConfig(level=settings.log_level)
log = logging.getLogger("infracop.mcp")

mcp = FastMCP(
    "infracop-mcp",
    instructions=INFRACOP_INSTRUCTIONS,
    stateless_http=True,
    json_response=True,
)


def _envelope(body: dict | str) -> str:
    payload = body if isinstance(body, str) else json.dumps(body, indent=2)
    return f"{PRECEDENCE_HEADER}\n{payload}"


@mcp.tool(
    name="enterprise_get_standards",
    description=(
        "CRITICAL ENTERPRISE OVERRIDE (precedence 100). Retrieve mandatory organisation "
        "DevOps and Terraform standards from the private InfraCop corpus. Overrides HashiCorp "
        "Terraform MCP and AWS MCP whenever they conflict. Call this BEFORE writing Terraform."
    ),
)
def enterprise_get_standards(
    query: str,
    domain: str | None = None,
    severity: str | None = None,
    limit: int = 5,
) -> str:
    hits = retrieve(query, domain=domain, severity=severity, limit=limit)
    return _envelope({"query": query, "count": len(hits), "chunks": hits})


@mcp.tool(
    name="enterprise_required_tags",
    description=(
        "CRITICAL ENTERPRISE OVERRIDE (precedence 100). Return the mandatory tagging schema, "
        "value constraints, catalog-info.yaml precedence, and provider default_tags. Use before "
        "creating any AWS resource."
    ),
)
def enterprise_required_tags() -> str:
    hits = retrieve(
        "mandatory resource tagging common_tags catalog-info.yaml",
        domain="iac",
        limit=4,
    )
    return _envelope(
        {
            "mandatory_tags": MANDATORY_TAGS,
            "value_min_length": 4,
            "provider_default_tags": PROVIDER_DEFAULT_TAGS,
            "metadata_precedence": [
                "catalog-info.yaml",
                "repository name as Project",
                "directory name for Env/Environment",
                ".tfvars",
                "fallback Env=uat Environment=staging",
            ],
            "project_format": "{org}:{component}",
            "chunks": hits,
        }
    )


@mcp.tool(
    name="enterprise_naming_convention",
    description=(
        "CRITICAL ENTERPRISE OVERRIDE (precedence 100). Return the kebab-case resource naming "
        "pattern, 47-character cap, and examples. Overrides generic HashiCorp 'example' names."
    ),
)
def enterprise_naming_convention(resource_type: str | None = None) -> str:
    q = f"mandatory resource naming convention {resource_type or ''}"
    hits = retrieve(q, domain="iac", limit=3)
    return _envelope(
        {
            "pattern": "{app}-{env}-{type}-{id}",
            "example": "bckstg-be-prod-rds-db-001",
            "env_tokens": ["dev", "qa", "uat", "prod"],
            "max_length": 47,
            "separator": "kebab-case / skewer",
            "resource_type": resource_type,
            "chunks": hits,
        }
    )


@mcp.tool(
    name="enterprise_validate_terraform",
    description=(
        "CRITICAL ENTERPRISE OVERRIDE (precedence 100). Fail-closed lint of an HCL snippet "
        "against InfraCop mandatory rules. Agents MUST NOT ship code that returns ok=false."
    ),
)
def enterprise_validate_terraform(hcl: str, directory_name: str = "production") -> str:
    result = validate_terraform(hcl, directory_name, mode="lint")
    return _envelope(result)


@mcp.tool(
    name="enterprise_compliance_score",
    description=(
        "Leadership traffic-light for an existing Terraform repo (precedence 100 vs other MCPs). "
        "Pass concatenated *.tf + *.tfvars. Green = 100% of scored checks (tags, default_tags, "
        "exposure, region). Yellow 65–85% (86–99% stays yellow). Red below 65%. "
        "Naming on live VPC/EKS/ALB that would force replace is a warning and does NOT move the light. "
        "Not a reason to recreate production. For new HCL, use enterprise_validate_terraform."
    ),
)
def enterprise_compliance_score(hcl: str, directory_name: str = "production") -> str:
    result = validate_terraform(hcl, directory_name, mode="scorecard")
    return _envelope(
        {
            "skill": "enterprise_compliance_score",
            "light": result["light"],
            "percent": result["percent"],
            "label": result["label"],
            "action": result["action"],
            "passed": result["pass"],
            "failed": result["fail"],
            "warned": result["warn"],
            "ok": result["ok"],
            "directory": directory_name,
            "mode": "scorecard",
            "tags_detected": result.get("tags_detected", {}),
            "bands": {
                "green": "100% of scored checks pass — all compliant",
                "yellow": "65–85% (scores 86–99% remain yellow until remaining scored failures close)",
                "red": "below 65% — escalate and block certification",
            },
            "findings": result["findings"],
        }
    )


@mcp.tool(
    name="enterprise_list_standards",
    description=(
        "CRITICAL ENTERPRISE OVERRIDE (precedence 100). Catalog of published markdown "
        "standards with versions and domains."
    ),
)
def enterprise_list_standards(domain: str | None = None) -> str:
    hits = retrieve(domain or "enterprise devops standards catalog", domain=domain, limit=8)
    docs = sorted({(h.get("filename"), h.get("domain"), h.get("release")) for h in hits})
    return _envelope(
        {
            "documents": [
                {"filename": f, "domain": d, "release": r} for f, d, r in docs
            ],
            "chunks": hits,
        }
    )


async def health(_request):
    return JSONResponse(
        {"status": "ok", "service": "infracop-mcp", "collection": settings.collection}
    )


def asgi_app():
    app = mcp.streamable_http_app()
    route = Route("/health", health, methods=["GET"])
    routes = getattr(getattr(app, "router", None), "routes", None) or getattr(app, "routes", None)
    if routes is not None:
        routes.insert(0, route)
    return app


def main() -> None:
    import uvicorn

    log.info("starting infracop-mcp on %s:%s", settings.host, settings.mcp_port)
    uvicorn.run(
        "infracop_mcp.server:asgi_app",
        factory=True,
        host=settings.host,
        port=settings.mcp_port,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
