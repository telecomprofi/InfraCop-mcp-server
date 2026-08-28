import {
  ENV_DIRECTORY_MAP,
  MANDATORY_TAGS,
  MAX_RESOURCE_NAME,
  NAMING_PATTERN,
  PROVIDER_DEFAULT_TAGS,
} from "./corpus";

export type FindingSeverity = "fail" | "warn" | "pass";

export type Finding = {
  id: string;
  severity: FindingSeverity;
  ruleId: string;
  title: string;
  detail: string;
  excerpt?: string;
};

const SAMPLE_BAD = `provider "aws" {
  region = "us-west-2"
}

resource "aws_db_instance" "main" {
  identifier          = "MyDatabase"
  instance_class      = "db.t3.micro"
  publicly_accessible = true
  tags = {
    Name = "db"
  }
}
`;

const SAMPLE_GOOD = `variable "common_tags" {
  type = map(string)
  default = {
    Organization = "empeek"
    CostCentre   = "tech-services"
    Project      = "empeek:platform"
    Owner        = "platform-services"
    Team         = "platform-services"
    Service      = "payments-api"
    Env          = "prod"
    Environment  = "production"
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Terraform  = "true"
      GithubRepo = "empeek/platform/"
      GithubPath = "envs/\${basename(path.cwd)}"
    }
  }
}

module "vpc" {
  source = "empeek/vpc/aws"
  tags = merge(
    var.common_tags,
    { Description = "VPC for platform" }
  )
}

resource "aws_db_instance" "primary" {
  identifier = "pay-api-prod-rds-db-001"
  tags = merge(var.common_tags, { Description = "payments primary" })
}
`;

export const INSPECTOR_SAMPLES = {
  noncompliant: SAMPLE_BAD,
  compliant: SAMPLE_GOOD,
};

function extractMap(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

function findBlock(hcl: string, needle: string): string | null {
  const idx = hcl.indexOf(needle);
  if (idx < 0) return null;
  const from = hcl.indexOf("{", idx);
  if (from < 0) return null;
  let depth = 0;
  for (let i = from; i < hcl.length; i++) {
    if (hcl[i] === "{") depth++;
    if (hcl[i] === "}") {
      depth--;
      if (depth === 0) return hcl.slice(from, i + 1);
    }
  }
  return null;
}

export function inspectTerraform(hcl: string, directoryName = "production"): Finding[] {
  const findings: Finding[] = [];
  const common = findBlock(hcl, "common_tags") ?? findBlock(hcl, "default = {");
  const tags = common ? extractMap(common) : extractMap(hcl);

  for (const key of MANDATORY_TAGS) {
    const value = tags[key];
    if (!value) {
      findings.push({
        id: `tag-missing-${key}`,
        severity: "fail",
        ruleId: "iac-terraform.mandatory-resource-tagging",
        title: `Missing mandatory tag ${key}`,
        detail: `Every resource must carry ${key}. OPA denies /envs/production/*.tf when this key is absent or shorter than 4 characters.`,
      });
    } else if (value.trim().length < 4) {
      findings.push({
        id: `tag-short-${key}`,
        severity: "fail",
        ruleId: "iac-terraform.mandatory-resource-tagging",
        title: `Tag ${key} is shorter than 4 characters`,
        detail: `Value "${value}" fails the OPA production gate (must be longer than 3 characters).`,
        excerpt: `${key} = "${value}"`,
      });
    } else {
      findings.push({
        id: `tag-ok-${key}`,
        severity: "pass",
        ruleId: "iac-terraform.mandatory-resource-tagging",
        title: `${key} present`,
        detail: value,
      });
    }
  }

  const project = tags.Project;
  if (project && !project.includes(":")) {
    findings.push({
      id: "project-prefix",
      severity: "fail",
      ruleId: "iac-terraform.prepend-project",
      title: "Project tag is missing the org prefix",
      detail: `Expected "{org}:{component}", e.g. "empeek:platform". Got "${project}".`,
      excerpt: `Project = "${project}"`,
    });
  }

  const envMap = ENV_DIRECTORY_MAP[directoryName];
  if (envMap) {
    if (tags.Env && tags.Env !== envMap.env && !(directoryName === "production" && tags.Env === "production")) {
      findings.push({
        id: "env-mismatch",
        severity: "warn",
        ruleId: "iac-terraform.directory-name",
        title: "Env tag does not match directory",
        detail: `Directory "${directoryName}" maps to Env="${envMap.env}". Found Env="${tags.Env}".`,
      });
    }
  }

  const defaultTagsBlock = findBlock(hcl, "default_tags");
  if (!defaultTagsBlock) {
    findings.push({
      id: "default-tags-missing",
      severity: "fail",
      ruleId: "iac-terraform.mandatory-resource-tagging",
      title: "provider default_tags block missing",
      detail: "The AWS provider must set Terraform, GithubRepo, and GithubPath so resources without a tags argument are still attributable.",
    });
  } else {
    const dt = extractMap(defaultTagsBlock);
    for (const key of PROVIDER_DEFAULT_TAGS) {
      if (!dt[key]) {
        findings.push({
          id: `default-${key}`,
          severity: "fail",
          ruleId: "iac-terraform.mandatory-resource-tagging",
          title: `default_tags missing ${key}`,
          detail: `Add ${key} inside provider "aws" { default_tags { ... } }.`,
        });
      } else {
        findings.push({
          id: `default-ok-${key}`,
          severity: "pass",
          ruleId: "iac-terraform.mandatory-resource-tagging",
          title: `default_tags.${key} present`,
          detail: dt[key]!,
        });
      }
    }
  }

  if (!/merge\s*\(\s*var\.common_tags/.test(hcl)) {
    findings.push({
      id: "merge-common-tags",
      severity: "fail",
      ruleId: "iac-terraform.mandatory-resource-tagging",
      title: "Resources do not merge var.common_tags",
      detail: "Resource and module tags must use tags = merge(var.common_tags, { ... }).",
    });
  } else {
    findings.push({
      id: "merge-ok",
      severity: "pass",
      ruleId: "iac-terraform.mandatory-resource-tagging",
      title: "merge(var.common_tags) used",
      detail: "Resource tags inherit the mandatory set.",
    });
  }

  const names: string[] = [];
  const nameRe =
    /\b(?:identifier|name|bucket|cluster_identifier)\s*=\s*"([^"]+)"/g;
  let nm: RegExpExecArray | null;
  while ((nm = nameRe.exec(hcl))) names.push(nm[1]!);

  if (!names.length) {
    findings.push({
      id: "no-names",
      severity: "warn",
      ruleId: "iac-terraform.mandatory-resource-naming-convention",
      title: "No resource names found to check",
      detail: "Could not find identifier/name/bucket attributes in this snippet.",
    });
  }

  for (const name of names) {
    if (name.length >= MAX_RESOURCE_NAME) {
      findings.push({
        id: `name-len-${name}`,
        severity: "fail",
        ruleId: "iac-terraform.mandatory-resource-naming-convention",
        title: `Name exceeds ${MAX_RESOURCE_NAME} characters`,
        detail: `"${name}" is ${name.length} characters. Hard limit is 47.`,
        excerpt: name,
      });
    } else if (!NAMING_PATTERN.test(name) && !name.includes("${")) {
      findings.push({
        id: `name-pattern-${name}`,
        severity: "fail",
        ruleId: "iac-terraform.mandatory-resource-naming-convention",
        title: "Name does not match {app}-{env}-{type}-{id}",
        detail: `Got "${name}". Expected kebab-case like bckstg-be-prod-rds-db-001 with a short env token (dev|qa|uat|prod).`,
        excerpt: name,
      });
    } else {
      findings.push({
        id: `name-ok-${name}`,
        severity: "pass",
        ruleId: "iac-terraform.mandatory-resource-naming-convention",
        title: `Name "${name}" matches convention`,
        detail: `${name.length} characters, kebab-case with env token.`,
      });
    }
  }

  if (/publicly_accessible\s*=\s*true/.test(hcl)) {
    findings.push({
      id: "public-db",
      severity: "fail",
      ruleId: "security.network-exposure",
      title: "Publicly accessible database",
      detail: "RDS, ElastiCache, OpenSearch, and Qdrant must live in private subnets. publicly_accessible = true is forbidden.",
    });
  }

  if (/region\s*=\s*"(?!us-east-1|eu-central-1)[^"]+"/.test(hcl) && !/catalog-info/.test(hcl)) {
    const region = /region\s*=\s*"([^"]+)"/.exec(hcl)?.[1];
    if (region && region !== "us-east-1" && region !== "eu-central-1") {
      findings.push({
        id: "region",
        severity: "fail",
        ruleId: "aws-infra.accounts-and-regions",
        title: `Region ${region} is not in the allow-list`,
        detail: "Allowed regions are us-east-1 and eu-central-1 unless catalog-info.yaml sets spec.region.",
        excerpt: `region = "${region}"`,
      });
    }
  }

  if (/auto-stop\s*=\s*"true"/.test(hcl) && (directoryName === "production" || directoryName === "prod")) {
    findings.push({
      id: "autostop-prod",
      severity: "fail",
      ruleId: "aws-infra.weekend-cost-controls",
      title: "auto-stop is forbidden in production",
      detail: "holiday-pause / auto-stop tags are for lower environments only.",
    });
  }

  return findings;
}

export function findingCounts(findings: Finding[]) {
  return {
    fail: findings.filter((f) => f.severity === "fail").length,
    warn: findings.filter((f) => f.severity === "warn").length,
    pass: findings.filter((f) => f.severity === "pass").length,
  };
}
