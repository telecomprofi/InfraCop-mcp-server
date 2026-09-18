from __future__ import annotations

import re
from functools import lru_cache

MANDATORY_TAGS = [
    "Organization",
    "CostCentre",
    "Project",
    "Owner",
    "Team",
    "Service",
    "Env",
    "Environment",
]
PROVIDER_DEFAULT_TAGS = ["Terraform", "GithubRepo", "GithubPath"]
NAMING = re.compile(
    r"^[a-z0-9]+(?:-[a-z0-9]+)*-(dev|qa|uat|prod)-[a-z0-9]+(?:-[a-z0-9]+)*(?:-\d{3})?$"
)
MAX_NAME = 47
ALLOWED_REGIONS = {"us-east-1", "eu-central-1"}

# Rename recreates the live resource. Scorecard never fails these; lint warns.
RECREATE_PREFIXES = (
    "aws_eks",
    "aws_vpc",
    "aws_subnet",
    "aws_nat_gateway",
    "aws_internet_gateway",
    "aws_eip",
    "aws_route",
    "aws_security_group",
    "aws_iam",
    "aws_kms",
    "aws_lb",
    "aws_alb",
    "aws_launch",
    "aws_autoscaling",
    "aws_cloudwatch",
)
STRICT_NAME_TYPES = (
    "aws_db_instance",
    "aws_rds_cluster",
    "aws_s3_bucket",
    "aws_elasticache_cluster",
    "aws_elasticache_replication_group",
    "aws_dynamodb_table",
    "aws_mq_broker",
    "aws_redshift_cluster",
    "aws_opensearch_domain",
    "aws_msk_cluster",
)
SKIP_RESOURCE_PREFIXES = (
    "kubernetes_",
    "kubectl_",
    "helm_",
    "null_",
    "random_",
    "time_",
    "tls_",
    "local_",
    "external_",
    "archive_",
    "cloudinit_",
)
ASSIGN_RE = re.compile(
    r'([A-Za-z_][A-Za-z0-9_]*)\s*=\s*("(?:\\.|[^"])*"|[A-Za-z0-9_.:/-]+)'
)
RESOURCE_RE = re.compile(r'resource\s+"([^"]+)"\s+"([^"]+)"\s*\{', re.M)
NAME_ATTR_RE = re.compile(
    r'\b(?:identifier|name|bucket|cluster_identifier)\s*=\s*"([^"]+)"'
)

# Maps validator rule_id -> published markdown section. Live heading/version
# overlay from Qdrant when the corpus has been ingested.
STANDARD_CATALOG = {
    "iac-terraform.mandatory-resource-tagging": {
        "file": "iac-terraform.md",
        "section": "Mandatory Resource tagging",
        "ref": "iac-terraform.md#mandatory-resource-tagging",
    },
    "iac-terraform.mandatory-resource-naming-convention": {
        "file": "iac-terraform.md",
        "section": "Mandatory Resource Naming convention",
        "ref": "iac-terraform.md#mandatory-resource-naming-convention",
    },
    "iac-terraform.prepend-project": {
        "file": "iac-terraform.md",
        "section": "Mandatory Resource tagging",
        "ref": "iac-terraform.md#mandatory-resource-tagging",
    },
    "security.network-exposure": {
        "file": "security.md",
        "section": "Network exposure",
        "ref": "security.md#network-exposure",
    },
    "aws-infra.accounts-and-regions": {
        "file": "aws-infra.md",
        "section": "Accounts and regions",
        "ref": "aws-infra.md#accounts-and-regions",
    },
    "aws-infra.weekend-cost-controls": {
        "file": "aws-infra.md",
        "section": "Weekend cost controls",
        "ref": "aws-infra.md#weekend-cost-controls",
    },
}


@lru_cache(maxsize=64)
def cite_rule(rule_id: str) -> dict:
    """Section + version for a rule. Qdrant payload wins when the corpus is loaded."""
    base = STANDARD_CATALOG.get(
        rule_id,
        {
            "file": f"{rule_id.split('.')[0]}.md",
            "section": rule_id,
            "ref": rule_id,
        },
    )
    cite = {
        "rule_id": rule_id,
        "section": base["section"],
        "file": base["file"],
        "ref": base["ref"],
        "version": "unknown",
    }
    live = _qdrant_cite(rule_id)
    if live:
        if live.get("section"):
            cite["section"] = live["section"]
        if live.get("file"):
            cite["file"] = live["file"]
            heading = live.get("section") or base["section"]
            slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")[:48]
            cite["ref"] = f"{live['file']}#{slug}"
        if live.get("version"):
            cite["version"] = live["version"]
        if live.get("heading_path"):
            cite["heading_path"] = live["heading_path"]
    return cite


_QDRANT_OK: bool | None = None


def _qdrant_cite(rule_id: str) -> dict | None:
    global _QDRANT_OK
    if _QDRANT_OK is False:
        return None
    try:
        from qdrant_client.http import models as qm

        from .retriever import get_client
        from .settings import settings

        points, _ = get_client().scroll(
            collection_name=settings.collection,
            scroll_filter=qm.Filter(
                must=[qm.FieldCondition(key="rule_id", match=qm.MatchValue(value=rule_id))]
            ),
            limit=1,
            with_payload=True,
        )
        _QDRANT_OK = True
        if not points:
            points, _ = get_client().scroll(
                collection_name=settings.collection,
                limit=1,
                with_payload=True,
            )
            if points:
                rel = (points[0].payload or {}).get("release")
                return {"version": rel} if rel else None
            return None
        payload = dict(points[0].payload or {})
        return {
            "section": payload.get("heading"),
            "file": payload.get("filename"),
            "version": payload.get("release"),
            "heading_path": payload.get("heading_path"),
        }
    except Exception:
        _QDRANT_OK = False
        return None


def _with_cite(finding: dict) -> dict:
    cite = cite_rule(finding["rule_id"])
    return {**cite, **finding, "section": cite["section"], "version": cite["version"], "file": cite["file"], "ref": cite["ref"]}


def _brace_block(hcl: str, from_idx: int) -> str | None:
    start = hcl.find("{", from_idx)
    if start < 0:
        return None
    depth = 0
    for i, ch in enumerate(hcl[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return hcl[start : i + 1]
    return None


def _map_from(block: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, raw in ASSIGN_RE.findall(block):
        val = raw[1:-1] if raw.startswith('"') else raw.strip()
        out[key] = val
    return out


def _collect_tags(hcl: str) -> dict[str, str]:
    """Merge every common_tags / tags / default_tags map. Later maps win."""
    tags: dict[str, str] = {}
    for m in re.finditer(r"\b(common_tags|default_tags|tags)\b", hcl):
        blk = _brace_block(hcl, m.start())
        if blk:
            tags.update(_map_from(blk))
    wanted = set(MANDATORY_TAGS + PROVIDER_DEFAULT_TAGS)
    for key, raw in ASSIGN_RE.findall(hcl):
        if key in wanted:
            tags[key] = raw[1:-1] if raw.startswith('"') else raw.strip()
    return tags


def _tag_present(value: str) -> bool:
    if not value:
        return False
    if value.startswith("var.") or value.startswith("local.") or value.startswith("module."):
        return True
    return len(value.strip()) >= 4


def _uses_common_tags(hcl: str) -> bool:
    return bool(
        re.search(
            r"(merge\s*\(\s*(var|local)\.common_tags|(var|local)\.common_tags)",
            hcl,
        )
    )


def _is_recreate_type(rtype: str) -> bool:
    return rtype.startswith(RECREATE_PREFIXES)


def _iter_aws_resources(hcl: str) -> list[tuple[str, str, str]]:
    out: list[tuple[str, str, str]] = []
    for m in RESOURCE_RE.finditer(hcl):
        rtype, label = m.group(1), m.group(2)
        if not rtype.startswith("aws_"):
            continue
        if rtype.startswith(SKIP_RESOURCE_PREFIXES):
            continue
        body = _brace_block(hcl, m.start()) or ""
        out.append((rtype, label, body))
    return out


def validate_terraform(
    hcl: str,
    directory_name: str = "production",
    mode: str = "lint",
) -> dict:
    """mode=lint is fail-closed for new HCL. mode=scorecard is a leadership light:
    tags/security/region count; existing-resource names that would force replace are warnings.
    """
    findings: list[dict] = []
    tags = _collect_tags(hcl)
    scorecard = mode == "scorecard"

    for key in MANDATORY_TAGS:
        value = tags.get(key, "")
        if not value:
            findings.append(
                {
                    "severity": "fail",
                    "rule_id": "iac-terraform.mandatory-resource-tagging",
                    "title": f"Missing mandatory tag {key}",
                    "detail": "OPA denies /envs/production/*.tf when this key is absent or shorter than 4 characters.",
                    "counts": True,
                }
            )
        elif not _tag_present(value):
            findings.append(
                {
                    "severity": "fail",
                    "rule_id": "iac-terraform.mandatory-resource-tagging",
                    "title": f"Tag {key} is shorter than 4 characters",
                    "detail": f'Value "{value}" fails the OPA production gate.',
                    "counts": True,
                }
            )
        else:
            findings.append(
                {
                    "severity": "pass",
                    "rule_id": "iac-terraform.mandatory-resource-tagging",
                    "title": f"{key} present",
                    "detail": value,
                    "counts": True,
                }
            )

    project = tags.get("Project", "")
    if project and ":" not in project and not project.startswith(("var.", "local.")):
        findings.append(
            {
                "severity": "fail",
                "rule_id": "iac-terraform.prepend-project",
                "title": "Project tag is missing the org prefix",
                "detail": f'Expected "{{org}}:{{component}}". Got "{project}".',
                "counts": True,
            }
        )

    default_tags_present = bool(re.search(r"\bdefault_tags\b", hcl))
    default_via_common = bool(
        re.search(r"default_tags[\s\S]{0,400}(var|local)\.common_tags", hcl)
    )
    if not default_tags_present:
        findings.append(
            {
                "severity": "fail",
                "rule_id": "iac-terraform.mandatory-resource-tagging",
                "title": "provider default_tags block missing",
                "detail": "AWS provider must set Terraform, GithubRepo, GithubPath.",
                "counts": True,
            }
        )
    else:
        for key in PROVIDER_DEFAULT_TAGS:
            if key in tags or default_via_common:
                findings.append(
                    {
                        "severity": "pass",
                        "rule_id": "iac-terraform.mandatory-resource-tagging",
                        "title": f"default_tags.{key} present",
                        "detail": tags.get(key, "via var.common_tags"),
                        "counts": True,
                    }
                )
            else:
                findings.append(
                    {
                        "severity": "fail",
                        "rule_id": "iac-terraform.mandatory-resource-tagging",
                        "title": f"default_tags missing {key}",
                        "detail": f'Add {key} inside provider "aws" {{ default_tags {{ ... }} }}.',
                        "counts": True,
                    }
                )

    if _uses_common_tags(hcl):
        findings.append(
            {
                "severity": "pass",
                "rule_id": "iac-terraform.mandatory-resource-tagging",
                "title": "common_tags applied to resources or provider",
                "detail": "var.common_tags / local.common_tags is referenced.",
                "counts": True,
            }
        )
    else:
        findings.append(
            {
                "severity": "fail",
                "rule_id": "iac-terraform.mandatory-resource-tagging",
                "title": "Resources do not merge var.common_tags",
                "detail": "Use tags = merge(var.common_tags, { ... }) or default_tags { tags = var.common_tags }.",
                "counts": True,
            }
        )

    for rtype, label, body in _iter_aws_resources(hcl):
        for name in NAME_ATTR_RE.findall(body):
            if "${" in name:
                continue
            recreate = _is_recreate_type(rtype)
            strict = rtype in STRICT_NAME_TYPES
            if recreate:
                sev, counts = "warn", False
            elif strict:
                sev, counts = "fail", True
            elif scorecard:
                sev, counts = "warn", False
            else:
                sev, counts = "fail", True
            if len(name) >= MAX_NAME:
                findings.append(
                    {
                        "severity": sev,
                        "rule_id": "iac-terraform.mandatory-resource-naming-convention",
                        "title": f"{rtype}.{label} name exceeds {MAX_NAME} characters",
                        "detail": f'"{name}" is {len(name)} characters.',
                        "counts": counts,
                    }
                )
            elif not NAMING.match(name):
                extra = (
                    " Renaming this resource type in place would force Terraform to recreate it; treated as a warning, not a certification fail."
                    if recreate or scorecard
                    else ""
                )
                findings.append(
                    {
                        "severity": sev,
                        "rule_id": "iac-terraform.mandatory-resource-naming-convention",
                        "title": f'{rtype}.{label} name does not match {{app}}-{{env}}-{{type}}-{{id}}',
                        "detail": f'Got "{name}".{extra}',
                        "counts": counts,
                    }
                )
            else:
                findings.append(
                    {
                        "severity": "pass",
                        "rule_id": "iac-terraform.mandatory-resource-naming-convention",
                        "title": f'{rtype}.{label} name "{name}" matches convention',
                        "detail": f"{len(name)} characters, kebab-case with env token.",
                        "counts": True,
                    }
                )

    if re.search(r"publicly_accessible\s*=\s*true", hcl):
        findings.append(
            {
                "severity": "fail",
                "rule_id": "security.network-exposure",
                "title": "Publicly accessible database",
                "detail": "RDS must live in private subnets.",
                "counts": True,
            }
        )

    region = re.search(r'region\s*=\s*"([^"]+)"', hcl)
    if region and region.group(1) not in ALLOWED_REGIONS:
        findings.append(
            {
                "severity": "fail",
                "rule_id": "aws-infra.accounts-and-regions",
                "title": f"Region {region.group(1)} is not in the allow-list",
                "detail": "Allowed: us-east-1, eu-central-1 unless catalog-info.yaml sets spec.region.",
                "counts": True,
            }
        )

    if re.search(r'auto-stop\s*=\s*"true"', hcl) and directory_name in {"production", "prod"}:
        findings.append(
            {
                "severity": "fail",
                "rule_id": "aws-infra.weekend-cost-controls",
                "title": "auto-stop is forbidden in production",
                "detail": "holiday-pause / auto-stop tags are for lower environments only.",
                "counts": True,
            }
        )

    scored = [f for f in findings if f.get("counts", True) and f["severity"] in {"fail", "pass"}]
    fails = sum(1 for f in scored if f["severity"] == "fail")
    passes = sum(1 for f in scored if f["severity"] == "pass")
    warns = sum(1 for f in findings if f["severity"] == "warn")
    total = fails + passes
    percent = 0 if total == 0 else round(100 * passes / total)
    if percent >= 100:
        light, label, action = (
            "green",
            "All compliant",
            "Safe to certify and release.",
        )
    elif percent >= 65:
        light, label, action = (
            "yellow",
            "Improvement needed",
            "Improvement plan required. Do not expand the footprint.",
        )
    else:
        light, label, action = (
            "red",
            "Escalate",
            "Block production certification until the gap closes.",
        )
    cited = [_with_cite(f) for f in findings]
    versions = sorted({c.get("version") or "unknown" for c in cited})
    return {
        "ok": fails == 0,
        "fail": fails,
        "pass": passes,
        "warn": warns,
        "percent": percent,
        "light": light,
        "label": label,
        "action": action,
        "directory": directory_name,
        "mode": mode,
        "standards_version": versions[0] if len(versions) == 1 else versions,
        "tags_detected": {k: tags[k] for k in MANDATORY_TAGS if k in tags},
        "findings": cited,
    }
