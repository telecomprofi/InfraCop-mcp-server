# InfraCop MCP

Private MCP server that gives infrastructure agents **enterprise DevOps and Terraform standards** — one policy, every AWS account, every team.

Standards live in [telecomprofi/Ent-DevOps-Standards](https://github.com/telecomprofi/Ent-DevOps-Standards). A GitHub **release** fires a webhook. InfraCop chunks, embeds (Amazon Titan Text Embeddings V2), and upserts **Qdrant**. Agents retrieve those rules **before** they write Terraform. InfraCop answers have **precedence 100** over HashiCorp Terraform MCP and AWS agentic skills.

This repo is the control plane:

| Path | What it is |
| --- | --- |
| [`mcp-server/`](mcp-server/) | Python MCP (FastMCP + LangChain + Qdrant), Lambda container |
| [`infra/terraform/`](infra/terraform/) | Serverless AWS: HTTP API, two Lambdas, secrets, alarms |
| [`agent-config/`](agent-config/) | Mandatory `mcp.json` + `AGENTS.md` for every Terraform repo |
| [`src/`](src/) | Operator console — corpus, inspector (traffic-light), playground, leadership briefing |
| [`public/infracop-leadership-brief.pptx`](public/infracop-leadership-brief.pptx) | Leadership deck (import into Google Slides) |

## InfraCop MCP server use workflow

![InfraCop MCP server use workflow](docs/infracop-mcp-server-use-workflow.jpg)

1. **Platform team** writes or updates a standard as `.md` and opens a PR on the Enterprise Standards GitHub repo.
2. **DevOps / Infra team leads** review, approve, and merge.
3. A **webhook** re-reads the standards. The MCP server chunks, embeds, and upserts **Qdrant** (RAG) in AWS.
4. **Infra GitHub repos** hold Terraform plus mandatory MCP config that tells agents (Claude Code, GitHub Copilot) to use InfraCop first.
5. Agents generate IaC; **DevOps / Infra teams** review and commit.
6. That Terraform **defines** application infrastructure in AWS.
7. **Datadog** monitors it and generates alerts; **SRE** responds to incidents.

## Why

Without a single live standard, DevOps squads invent their own Terraform. Production certification slips. Auditors find public databases and missing owner tags. FinOps cannot allocate spend. On-call cannot page an owner for `db-prod` or a 17-character hash. Confluence pages and Copilot skill files go stale across 20+ accounts and two AWS Organizations.

After InfraCop is **mandatory** in every Terraform repository:

1. Authors open a PR on Ent-DevOps-Standards.
2. Team leads review, approve, and **tag a release**.
3. The webhook chunks / embeds and updates Qdrant.
4. Five DevOps teams’ agents call InfraCop (RAG) before they emit HCL.
5. Resources carry Owner, Project, Env, and `{app}-{env}-{type}-{id}` names.
6. **Cost Explorer** can show ProjectX staging vs production across accounts.
7. **Datadog** routes a prod alert to the owning SRE team.

## MCP tools (precedence 100)

| Tool | Use |
| --- | --- |
| `enterprise_get_standards` | Hybrid retrieve (Titan dense + BM25) over the live corpus |
| `enterprise_required_tags` | Mandatory tag schema and catalog-info.yaml precedence |
| `enterprise_naming_convention` | 47-character kebab `{app}-{env}-{type}-{id}` |
| `enterprise_validate_terraform` | Fail-closed lint of an HCL snippet |
| `enterprise_compliance_score` | Traffic-light for leadership |
| `enterprise_list_standards` | Catalog of published `.md` files and release tags |

### Traffic light

| Light | Score | Meaning |
| --- | --- | --- |
| Green | **100%** of mandatory rules | Safe to certify and release |
| Yellow | **65–85%** (86–99% stays yellow until 100%) | Improvement plan this quarter |
| Red | **< 65%** | Block production certification |

Recommended-only findings do not move the light.

## Retrieval

- **Chunking:** MarkdownHeaderTextSplitter, then RecursiveCharacterTextSplitter (~450 tokens, 18% overlap). Parent-document retrieval. Severity inferred from MUST / SHOULD / MAY.
- **Embeddings:** `amazon.titan-embed-text-v2:0` at 1024 dims on Bedrock (in-account, no data leaves AWS).
- **Store:** Qdrant Cloud, HNSW. Payload: `rule_id`, `domain`, `severity`, `heading_path`, `release`.
- **Query:** dense kNN + BM25 rerank + synonym expansion. No generative LLM on the retrieve path (warm p99 budget < 500 ms).

## Deploy (AWS, serverless)

NFRs: 99% availability, minimum always-on infra, ≥ 20 concurrent agents, warm p99 < 500 ms (first request 3–4 s acceptable).

```text
GitHub release ──► ingest Lambda ──► Qdrant Cloud
Agents / console ──► HTTP API (API key) ──► MCP Lambda (FastMCP, provisioned concurrency 3, reserved 25)
```

1. Stand up a Qdrant Cloud cluster (replica for availability).
2. Build and push `mcp-server/Dockerfile` to ECR.
3. `terraform apply` in `infra/terraform` with Qdrant URL, webhook secret, and per-team API keys.
4. Point the Ent-DevOps-Standards **release** webhook at the ingest URL.
5. Copy [`agent-config/mcp.json`](agent-config/mcp.json) and [`agent-config/AGENTS.md`](agent-config/AGENTS.md) into every application Terraform repo. Treat them as required, not optional.

Copy [`.env.example`](.env.example) for local MCP runs. Do not commit secrets.

## Agent config (mandatory)

Every infrastructure repository must list InfraCop **first**. Conflict rule: if HashiCorp or AWS MCP disagrees with InfraCop, follow InfraCop.

```json
{
  "mcpServers": {
    "infracop-mcp": {
      "url": "https://REPLACE_ME.execute-api.us-east-1.amazonaws.com/mcp",
      "headers": { "Authorization": "Bearer ${INFRACOP_MCP_TOKEN}" }
    }
  }
}
```

## Operator console

The TanStack app in this repo is the operator surface: standards browser, hybrid retrieve playground, Terraform inspector with traffic-light score, architecture, research notes, and a 16:9 leadership briefing (arrow keys, PPTX download).

## Local MCP tests

```bash
cd mcp-server
python -m pip install -e ".[dev]"
python -m pytest
```

## Related

- Standards source: [telecomprofi/Ent-DevOps-Standards](https://github.com/telecomprofi/Ent-DevOps-Standards)
- This server: [telecomprofi/InfraCop-mcp-server](https://github.com/telecomprofi/InfraCop-mcp-server)
