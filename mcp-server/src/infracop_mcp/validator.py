from __future__ import annotations

import re

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


def _map_from(block: str) -> dict[str, str]:
    return dict(re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"', block))


def _block(hcl: str, needle: str) -> str | None:
    idx = hcl.find(needle)
    if idx < 0:
        return None
    start = hcl.find("{", idx)
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


def validate_terraform(hcl: str, directory_name: str = "production") -> dict:
    findings: list[dict] = []
    common = _block(hcl, "common_tags") or _block(hcl, "default = {") or hcl
    tags = _map_from(common)

    for key in MANDATORY_TAGS:
        value = tags.get(key, "")
        if not value:
            findings.append(
                {
                    "severity": "fail",
                    "rule_id": "iac-terraform.mandatory-resource-tagging",
                    "title": f"Missing mandatory tag {key}",
                    "detail": "OPA denies /envs/production/*.tf when this key is absent or shorter than 4 characters.",
                }
            )
        elif len(value.strip()) < 4:
            findings.append(
                {
                    "severity": "fail",
                    "rule_id": "iac-terraform.mandatory-resource-tagging",
                    "title": f"Tag {key} is shorter than 4 characters",
                    "detail": f'Value "{value}" fails the OPA production gate.',
                }
            )
        else:
            findings.append(
                {
                    "severity": "pass",
                    "rule_id": "iac-terraform.mandatory-resource-tagging",
                    "title": f"{key} present",
                    "detail": value,
                }
            )

    project = tags.get("Project", "")
    if project and ":" not in project:
        findings.append(
            {
                "severity": "fail",
                "rule_id": "iac-terraform.prepend-project",
                "title": "Project tag is missing the org prefix",
                "detail": f'Expected "{{org}}:{{component}}". Got "{project}".',
            }
        )

    default_tags = _block(hcl, "default_tags")
    if not default_tags:
        findings.append(
            {
                "severity": "fail",
                "rule_id": "iac-terraform.mandatory-resource-tagging",
                "title": "provider default_tags block missing",
                "detail": "AWS provider must set Terraform, GithubRepo, GithubPath.",
            }
        )
    else:
        dt = _map_from(default_tags)
        for key in PROVIDER_DEFAULT_TAGS:
            if key not in dt:
                findings.append(
                    {
                        "severity": "fail",
                        "rule_id": "iac-terraform.mandatory-resource-tagging",
                        "title": f"default_tags missing {key}",
                        "detail": f'Add {key} inside provider "aws" {{ default_tags {{ ... }} }}.',
                    }
                )
            else:
                findings.append(
                    {
                        "severity": "pass",
                        "rule_id": "iac-terraform.mandatory-resource-tagging",
                        "title": f"default_tags.{key} present",
                        "detail": dt[key],
                    }
                )

    if not re.search(r"merge\s*\(\s*var\.common_tags", hcl):
        findings.append(
            {
                "severity": "fail",
                "rule_id": "iac-terraform.mandatory-resource-tagging",
                "title": "Resources do not merge var.common_tags",
                "detail": "Use tags = merge(var.common_tags, { ... }).",
            }
        )
    else:
        findings.append(
            {
                "severity": "pass",
                "rule_id": "iac-terraform.mandatory-resource-tagging",
                "title": "merge(var.common_tags) used",
                "detail": "Resource tags inherit the mandatory set.",
            }
        )

    for name in re.findall(r'\b(?:identifier|name|bucket|cluster_identifier)\s*=\s*"([^"]+)"', hcl):
        if "${" in name:
            continue
        if len(name) >= MAX_NAME:
            findings.append(
                {
                    "severity": "fail",
                    "rule_id": "iac-terraform.mandatory-resource-naming-convention",
                    "title": f"Name exceeds {MAX_NAME} characters",
                    "detail": f'"{name}" is {len(name)} characters.',
                }
            )
        elif not NAMING.match(name):
            findings.append(
                {
                    "severity": "fail",
                    "rule_id": "iac-terraform.mandatory-resource-naming-convention",
                    "title": "Name does not match {app}-{env}-{type}-{id}",
                    "detail": f'Got "{name}". Example: bckstg-be-prod-rds-db-001.',
                }
            )
        else:
            findings.append(
                {
                    "severity": "pass",
                    "rule_id": "iac-terraform.mandatory-resource-naming-convention",
                    "title": f'Name "{name}" matches convention',
                    "detail": f"{len(name)} characters, kebab-case with env token.",
                }
            )

    if re.search(r"publicly_accessible\s*=\s*true", hcl):
        findings.append(
            {
                "severity": "fail",
                "rule_id": "security.network-exposure",
                "title": "Publicly accessible database",
                "detail": "RDS must live in private subnets.",
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
            }
        )

    if re.search(r'auto-stop\s*=\s*"true"', hcl) and directory_name in {"production", "prod"}:
        findings.append(
            {
                "severity": "fail",
                "rule_id": "aws-infra.weekend-cost-controls",
                "title": "auto-stop is forbidden in production",
                "detail": "holiday-pause / auto-stop tags are for lower environments only.",
            }
        )

    fails = sum(1 for f in findings if f["severity"] == "fail")
    passes = sum(1 for f in findings if f["severity"] == "pass")
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
    return {
        "ok": fails == 0,
        "fail": fails,
        "pass": passes,
        "percent": percent,
        "light": light,
        "label": label,
        "action": action,
        "directory": directory_name,
        "findings": findings,
    }
