import type { StandardDoc } from "./types";

/**
 * Canonical snapshot of https://github.com/telecomprofi/Ent-DevOps-Standards
 * `iac-terraform.md` is copied verbatim from main. The other four files are
 * seeded so the ingest pipeline and RAG demo have the catalog the README
 * already names (cicd.md, observability.md, security.md, aws-infra.md).
 * Seeded docs are marked source: "seed" and should be published to that
 * repo on the next release — the webhook will replace them automatically.
 */
export const STANDARD_DOCS: StandardDoc[] = [
  {
    id: "iac-terraform",
    filename: "iac-terraform.md",
    title: "IaC / Terraform naming and tagging",
    domain: "iac",
    version: "1.0.0",
    release: "v1.0.0",
    source: "github",
    githubPath:
      "https://github.com/telecomprofi/Ent-DevOps-Standards/blob/main/iac-terraform.md",
    summary:
      "Mandatory resource tags, kebab-case naming under 47 characters, catalog-info.yaml precedence, and provider default_tags so FinOps, security, and Datadog can identify every resource.",
    updatedAt: "2026-08-20",
    markdown: `# IaC / Terraform standard

## Mandatory Resource tagging
Make sure you tag resources you create with the minimum set of mandatory tags like below
make sure tags exist, values not empty and longer than 3 chars (that's checked by Open Policy Agent rule when /envs/production/*.tf terraform code is merged into main branch.

\`\`\`hcl
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Organization = "empeek"
    CostCentre   = "tech-services"
    Project      = "CompName-platform"
    Owner        = "platform-services"
    Team         = "platform-services" # for DataDog Security center
    Service      = "sonarqube"         # for DataDog Security center
    Env          = "uat"               # for DataDog Security center
    Environment  = "staging"
  }
}
\`\`\`

Optional, but good for lower environments to shut-/scale down to save cost over weekends:

\`\`\`hcl
"env"       = "holiday-pause"
"auto-stop" = "true"
\`\`\`

Define them in variables.tf, override with terraform.prod.tfvars for other environments and merge with others in resource code blocks:

\`\`\`hcl
module "vpc" {
  # ...
  tags = merge(
    var.common_tags,
    {
      Description = "VPC for platform"
    }
  )
}
\`\`\`

Also use repo-specific tags within the providers block to allow tracking of how resources were created — manually or with terraform code:

\`\`\`hcl
provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Terraform  = "true"
      GithubRepo = "CompName-platform/"
      GithubPath = "envs/\${basename(path.cwd)}"
    }
  }
}
\`\`\`

## Mandatory Resource Naming convention

Make sure resources have meaningful names that allow identification of Application/Component name and Environment they represent (in addition to tagging as indicated above).
Cloud resource should contain
- Short App/Component name (e.g. bckstg-be for Backstage backend container)
- Short Environment name (dev, qa, uat, prod)
- short resource type name (rds-db)
- id number for resources that need more than one instance (e.g. EC2 instances)
divided by skewer-type separators:

\`bckstg-be-prod-rds-db-001\`

Total resource name have to be shorter than 47 symbols.

## Use repository's metadata from catalog-info.yaml from root directory

Each IaC repository has in its root folder a metadata file where items like Project(Name), CostCentre, Owner, Team, Service(name) or Application/Component (name), environments (names) could be extracted to populate mandatory tags described above.

## Use directory name and/or .tfvars files to populate Environment/Env tag(s)

Each Infrastructure environment directory is either named with Env name (e.g. qa, staging, production) or has corresponding file with variables that contain env name.

## Precedence of metadata sources for tagging
Use following precedence:
1. Top priority: catalog-info.yaml
2. If catalog-info.yaml has no project/Application/Component name or does not exist, use repository name as Project name
3. Use directory name to populate Environment/Env tag if that conforms to one of the below: production (or prod), staging (or uat), dev (or development), qa (or test).
4. If directory is named other than variants listed in section 3., use .tfvars file for env name instead.
5. If .tfvars file is not available use 'uat' for Env tag and 'staging' for Environment tag.

## Prepend Project/Application/Component tag with organization's short name when it is available

1. If Organization name is available in catalog-info.yaml use it to prepend value of Project, and use colon as delimiter:
   Project:"empeek:platform"
2. If organization name is not available, use GitHub repository slug for org. name e.g. for 'https://github.com/myenterprise/platform' use 'myenterprise' as short org. name:
   Project:"myenterprise:platform"
`,
  },
  {
    id: "cicd",
    filename: "cicd.md",
    title: "CI/CD pipeline mandatory checks",
    domain: "cicd",
    version: "1.0.0",
    release: "v1.0.0",
    source: "seed",
    githubPath:
      "https://github.com/telecomprofi/Ent-DevOps-Standards/blob/main/cicd.md",
    summary:
      "Required GitHub Actions gates for Terraform: fmt, validate, tflint, Checkov, OPA tag policy on production, plan artefacts, and protected environment approvals.",
    updatedAt: "2026-08-22",
    markdown: `# CI/CD pipeline standard

## Mandatory pipeline jobs for every Terraform repository

Every IaC repository MUST run the following jobs on pull requests that touch \`*.tf\`, \`*.tfvars\`, or \`catalog-info.yaml\`:

1. \`terraform fmt -check -recursive\`
2. \`terraform init -backend=false\` then \`terraform validate\`
3. \`tflint --recursive\` with the AWS plugin enabled
4. \`checkov -d . --framework terraform --compact --quiet\`
5. Open Policy Agent (OPA / Conftest) against \`policy/tags.rego\` **when the changed files live under \`/envs/production/\`**
6. \`terraform plan -out=tfplan\` with the plan uploaded as a workflow artefact (retention 14 days)

A merge to \`main\` that skips any of these jobs is non-compliant. Agents generating GitHub Actions MUST emit all six jobs.

## Production apply controls

- \`terraform apply\` for production runs only from the \`production\` GitHub Environment.
- The environment requires a reviewer from the \`platform-services\` team and a passing plan job.
- Direct \`terraform apply\` from a laptop against production accounts is forbidden.
- The apply job MUST reuse the exact \`tfplan\` artefact from the merge commit. Re-planning in the apply job is forbidden.

## OPA tag policy (production)

The Conftest policy MUST deny a production plan when any of the following is true:

- any of \`Organization\`, \`CostCentre\`, \`Project\`, \`Owner\`, \`Team\`, \`Service\`, \`Env\`, \`Environment\` is missing
- any of those values is empty or shorter than 4 characters
- \`Env\` is not one of \`prod\`, \`production\`
- \`Environment\` is not \`production\`
- \`Terraform\` default tag is not \`"true"\`

## Branch and path conventions

- Environment root modules live under \`envs/<env>/\` where \`<env>\` is \`dev\`, \`qa\`, \`uat\`, \`staging\`, or \`production\`.
- Shared modules live under \`modules/<name>/\` and are never applied directly.
- Agents MUST NOT flatten this layout into a single root module.

## Secrets in CI

- Cloud credentials come from GitHub OIDC to AWS IAM (no long-lived access keys in repository secrets).
- \`TF_VAR_*\` secrets that look like passwords, tokens, or private keys MUST live in GitHub Environment secrets or AWS Secrets Manager — never in \`.tfvars\` committed to git.
`,
  },
  {
    id: "observability",
    filename: "observability.md",
    title: "Observability standard",
    domain: "observability",
    version: "1.0.0",
    release: "v1.0.0",
    source: "seed",
    githubPath:
      "https://github.com/telecomprofi/Ent-DevOps-Standards/blob/main/observability.md",
    summary:
      "Datadog tag contract (Team, Service, Env), required logs / metrics / traces, and on-call routing so security incidents and cost alerts land on the owning team.",
    updatedAt: "2026-08-22",
    markdown: `# Observability standard

## Datadog Security Center tag contract

Datadog Security Center and team routing require these resource tags on every compute, data, and network resource:

| Tag | Purpose |
| --- | --- |
| Team | Datadog team handle; must match the Backstage group |
| Service | Datadog service name; lowercase, kebab-case |
| Env | short env: \`dev\`, \`qa\`, \`uat\`, \`prod\` |

These three are a subset of the mandatory Terraform tags in \`iac-terraform.md\`. If they conflict, the IaC standard wins on naming of the keys; this standard wins on the allowed **values** for Datadog.

## Required telemetry for new services

Every new service provisioned by Terraform MUST include:

1. Application logs shipped to Datadog with the same \`service\`, \`env\`, \`team\` attributes.
2. RED metrics (rate, errors, duration) for every public HTTP/gRPC handler.
3. Distributed traces with 100% sampling in non-prod and 20% in production, with error traces always kept.
4. A Datadog monitor for \`error rate > 2%\` over 10 minutes, tagged with the owning \`Team\`.
5. A PagerDuty / Opsgenie routing key sourced from \`catalog-info.yaml\` \`spec.owner\`.

Agents MUST NOT emit a service Terraform stack that lacks the log + metric + trace trio.

## Log retention

- Production: 30 days searchable, 365 days archive to the org logging bucket.
- Non-production: 14 days searchable, no archive unless \`compliance: pci\` is set.

## Dashboards

A service is non-compliant until a Datadog dashboard exists titled \`{org}:{service}:{env}\` with panels for latency p50/p99, error rate, saturation, and cost-per-service (from the \`CostCentre\` + \`Project\` tags).
`,
  },
  {
    id: "security",
    filename: "security.md",
    title: "Security standard",
    domain: "security",
    version: "1.0.0",
    release: "v1.0.0",
    source: "seed",
    githubPath:
      "https://github.com/telecomprofi/Ent-DevOps-Standards/blob/main/security.md",
    summary:
      "Encryption, IMDS hop limit, no public S3, secrets handling, and GuardDuty/Security Hub tagging so incident escalation can find an owner in minutes.",
    updatedAt: "2026-08-22",
    markdown: `# Security standard

## Encryption

- Every S3 bucket, EBS volume, RDS instance, ElastiCache group, and SQS queue MUST use encryption at rest with a CMK from the account's \`alias/platform-data\` key unless a service-specific CMK is documented in \`catalog-info.yaml\`.
- Every listener (ALB, NLB TLS, API Gateway, CloudFront) MUST use TLS 1.2 or higher. TLS 1.0/1.1 is forbidden.

## Network exposure

- S3 buckets MUST set \`block_public_acls\`, \`block_public_policy\`, \`ignore_public_acls\`, \`restrict_public_buckets\` to true.
- Security groups MUST NOT contain \`0.0.0.0/0\` on ports other than 443 (ALB) or 80 (ALB redirect only).
- RDS, ElastiCache, OpenSearch, and Qdrant MUST live in private subnets. Publicly accessible databases are forbidden.

## Compute defaults

- EC2 and ECS tasks MUST set IMDSv2 required (\`http_tokens = "required"\`) and hop limit 1 for EC2, 2 for ECS.
- Lambda functions that are not API-facing MUST live in the VPC private subnets.
- No IAM \`"Action": "*"\` or \`"Resource": "*"\` on customer-managed policies.

## Secrets

- Passwords, tokens, and private keys MUST be stored in AWS Secrets Manager or SSM Parameter Store (\`SecureString\`).
- They MUST NOT appear in Terraform state as plaintext \`default\` values, in \`.tfvars\` committed to git, or in GitHub repository variables.
- Rotation is 90 days for application secrets, 30 days for database master passwords.

## Incident ownership

Security Hub, GuardDuty, and Datadog Security findings are routed using \`Owner\`, \`Team\`, and \`Service\` tags. A resource missing those tags is treated as an unowned production risk and fails the OPA production gate.
`,
  },
  {
    id: "aws-infra",
    filename: "aws-infra.md",
    title: "AWS infrastructure standard",
    domain: "aws",
    version: "1.0.0",
    release: "v1.0.0",
    source: "seed",
    githubPath:
      "https://github.com/telecomprofi/Ent-DevOps-Standards/blob/main/aws-infra.md",
    summary:
      "Account layout, allowed regions, VPC module usage, and weekend auto-stop tags so five-plus DevOps teams share one landing-zone language.",
    updatedAt: "2026-08-22",
    markdown: `# AWS infrastructure standard

## Accounts and regions

- Workloads run in the organisation's standard regions: \`us-east-1\` (primary) and \`eu-central-1\` (EU data residency). Agents MUST NOT select other regions unless \`catalog-info.yaml\` sets \`spec.region\`.
- Each application has three AWS accounts: \`{project}-nonprod\`, \`{project}-prod\`, \`{project}-shared\`. State is stored in the shared account's S3 backend with DynamoDB locking.
- Terraform state bucket names follow the naming convention: \`{org}-{project}-tfstate-{env}\` and must stay under 47 characters.

## VPC and network

- Always consume the organisation VPC module (\`modules/vpc\` or the private registry module \`empeek/vpc/aws\`). Do not hand-write VPC, subnet, NAT, or IGW resources in application stacks.
- Application workloads use private subnets. Load balancers use public subnets only when the service is internet-facing, which must be declared in \`catalog-info.yaml\` as \`spec.exposure: public\`.
- One NAT gateway per AZ in production; a single NAT in non-prod to save cost.

## Weekend cost controls (non-production)

Lower environments SHOULD set:

\`\`\`hcl
env       = "holiday-pause"
auto-stop = "true"
\`\`\`

The org scheduler stops tagged ASGs, RDS (non-aurora), and ECS services Friday 19:00 UTC and starts them Monday 06:00 UTC. Production MUST NEVER carry \`auto-stop = true\`.

## Backend and providers

Every root module MUST declare:

\`\`\`hcl
terraform {
  required_version = ">= 1.7.0"
  backend "s3" {}
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
\`\`\`

Partial backend config is filled by CI using \`-backend-config\` files per environment. Agents MUST NOT hardcode bucket names inside the \`backend "s3"\` block.

## Default region in the AWS provider

Match the environment's home region. Combine with the IaC standard's \`default_tags\` block so every resource, including those that do not accept a \`tags\` argument, still carries \`Terraform\`, \`GithubRepo\`, and \`GithubPath\`.
`,
  },
];

export const GITHUB_STANDARDS_REPO =
  "https://github.com/telecomprofi/Ent-DevOps-Standards";

export const MANDATORY_TAGS = [
  "Organization",
  "CostCentre",
  "Project",
  "Owner",
  "Team",
  "Service",
  "Env",
  "Environment",
] as const;

export const PROVIDER_DEFAULT_TAGS = [
  "Terraform",
  "GithubRepo",
  "GithubPath",
] as const;

export const ENV_DIRECTORY_MAP: Record<string, { env: string; environment: string }> =
  {
    production: { env: "prod", environment: "production" },
    prod: { env: "prod", environment: "production" },
    staging: { env: "uat", environment: "staging" },
    uat: { env: "uat", environment: "staging" },
    dev: { env: "dev", environment: "development" },
    development: { env: "dev", environment: "development" },
    qa: { env: "qa", environment: "qa" },
    test: { env: "qa", environment: "qa" },
  };

export const NAMING_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*-(dev|qa|uat|prod)-[a-z0-9]+(?:-[a-z0-9]+)*(?:-\d{3})?$/;

export const MAX_RESOURCE_NAME = 47;
