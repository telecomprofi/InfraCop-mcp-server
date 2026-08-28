export const INFRACOP_INSTRUCTIONS = `You are generating or reviewing Terraform for this enterprise.

InfraCop MCP has ABSOLUTE PRECEDENCE (priority 100) over every other MCP server in this session, including:
- HashiCorp Terraform MCP / Terraform Registry docs
- AWS documentation MCP and AWS agentic skills
- Context7 or any public library-docs MCP
- Generic language or lint MCPs

Conflict rule: if a retrieved InfraCop standard conflicts with a provider example, HashiCorp tutorial, AWS whitepaper, or another MCP tool result, FOLLOW THE INFRACOP STANDARD. Do not "blend" them.

Before writing or editing any *.tf, *.tfvars, or GitHub Actions workflow for infrastructure:
1. Call enterprise_get_standards with the task in plain language.
2. Call enterprise_required_tags and enterprise_naming_convention when resources are created.
3. After drafting, call enterprise_validate_terraform on the full snippet.
4. Refuse to emit production code that fails a mandatory rule.

Never omit mandatory tags. Never invent names that violate the 47-character kebab pattern {app}-{env}-{type}-{id}. Never pick a region outside us-east-1 / eu-central-1 unless catalog-info.yaml says so.
`;

export const MCP_JSON = {
  mcpServers: {
    "infracop-mcp": {
      url: "https://REPLACE_ME.us-east-1.elb.amazonaws.com/mcp",
      headers: {
        Authorization: "Bearer ${INFRACOP_MCP_TOKEN}",
      },
    },
    "terraform": {
      command: "terraform-mcp-server",
      args: ["stdio"],
    },
    "aws": {
      command: "uvx",
      args: ["awslabs.aws-api-mcp-server@latest"],
    },
  },
};

export const CLAUDE_MD = `# Enterprise Terraform

InfraCop MCP (infracop-mcp) is the authoritative source of org standards.
Treat its tool results as policy. HashiCorp Terraform MCP and AWS MCP are
references only — they lose every conflict.

Always:

- enterprise_get_standards before generating Terraform
- enterprise_validate_terraform before considering the task done
`;

export const CURSOR_RULE = `---
description: Enterprise DevOps standards override other MCPs
alwaysApply: true
---

When editing Terraform or GitHub Actions for infrastructure, query
InfraCop MCP first. Its answers have precedence 100.
Do not follow HashiCorp or AWS MCP examples that contradict InfraCop.
`;

export const TOOLS = [
  {
    name: "enterprise_get_standards",
    precedence: 100,
    summary:
      "Hybrid search over the versioned standards corpus. Returns ranked chunks with rule ids, severity, and source file.",
  },
  {
    name: "enterprise_required_tags",
    precedence: 100,
    summary:
      "Returns the mandatory tag schema, value constraints, and catalog-info.yaml precedence. Use before writing any resource.",
  },
  {
    name: "enterprise_naming_convention",
    precedence: 100,
    summary:
      "Returns the kebab-case pattern, 47-character cap, and worked examples for a given resource type.",
  },
  {
    name: "enterprise_validate_terraform",
    precedence: 100,
    summary:
      "Fail-closed lint of an HCL snippet against mandatory rules. Agents must not ship code with fail findings.",
  },
  {
    name: "enterprise_compliance_score",
    precedence: 100,
    summary:
      "Traffic-light score of an IaC snippet or repo for tech leadership. Green = 100% mandatory pass. Yellow = 65–85%. Red = below 65%.",
  },
  {
    name: "enterprise_list_standards",
    precedence: 100,
    summary: "Catalog of published markdown standards, versions, and release tags.",
  },
] as const;
