export const EMBEDDING_MODELS = [
  {
    id: "titan-v2",
    name: "Amazon Titan Text Embeddings V2",
    verdict: "Recommended",
    dims: 1024,
    context: "8k",
    host: "Bedrock (same AWS account)",
    latency: "50–90ms",
    fit: "Stays private, serverless, Matryoshka so Qdrant can store 512 dims, English technical markdown. Best match to the NFR of minimum AWS infra + data residency.",
  },
  {
    id: "voyage-code-3",
    name: "voyage-code-3",
    verdict: "Quality upgrade",
    dims: 1024,
    context: "32k",
    host: "Voyage API",
    latency: "80–150ms",
    fit: "Best published code+NL retrieval. Use if the corpus grows into Terraform modules and HCL examples. Data leaves AWS.",
  },
  {
    id: "bge-m3",
    name: "BGE-M3",
    verdict: "Self-host hybrid",
    dims: 1024,
    context: "8k",
    host: "GPU / SageMaker",
    latency: "varies",
    fit: "Dense + sparse + multi-vector in one model. 568M params — too large for Lambda. Against the serverless constraint.",
  },
  {
    id: "te3-large",
    name: "OpenAI text-embedding-3-large",
    verdict: "Not selected",
    dims: 3072,
    context: "8k",
    host: "OpenAI API",
    latency: "60–120ms",
    fit: "Strong general retrieval, extra dimensions cost Qdrant RAM, data leaves AWS. No code-domain advantage over Titan for policy markdown.",
  },
  {
    id: "minilm",
    name: "all-MiniLM-L6-v2 (FastEmbed)",
    verdict: "Local / tests",
    dims: 384,
    context: "512",
    host: "In-process",
    latency: "<20ms",
    fit: "Default in qdrant/mcp-server-qdrant. Fine for demos, weak on long policy sections and identifier-heavy queries.",
  },
] as const;

export const CHUNKING_DECISION = {
  strategy: "MarkdownHeaderTextSplitter (H2/H3) + RecursiveCharacter 450 / 80 overlap",
  why: [
    "The corpus is structured markdown: each H2 is one rule (tags, naming, OPA, regions).",
    "Document-aware splitting beat fixed-size on technical docs in 2025–2026 surveys; Vectara NAACL 2025 found chunking config mattered as much as the embedding model.",
    "450 tokens with ~18% overlap is inside the 400–512 / 10–20% band that Firecrawl's 2026 review found best as a default.",
    "Parent-document: retrieve the tight child, return the full H2 so the agent sees the worked HCL example.",
    "Hybrid dense (Titan) + BM25 sparse (Qdrant) recovers exact identifiers — Env, CostCentre, bckstg-be — that embeddings blur.",
  ],
};

export const SIMILAR_SOLUTIONS = [
  {
    name: "qdrant/mcp-server-qdrant",
    url: "https://github.com/qdrant/mcp-server-qdrant",
    fit: "Official FastMCP + Qdrant memory server (store/find).",
    verdict: "Remix the wiring, replace the tools. It is a generic memory store, not policy, no GitHub-release ingest, no Terraform validator, MiniLM embeddings.",
  },
  {
    name: "HashiCorp Terraform MCP",
    url: "https://github.com/hashicorp/terraform-mcp-server",
    fit: "Registry providers, modules, private-registry org patterns.",
    verdict: "Keep it. Complementary. Lower precedence — it does not encode this company's tags, 47-char names, or OPA production gate.",
  },
  {
    name: "AWS Labs MCP / Serverless MCP",
    url: "https://github.com/awslabs/mcp",
    fit: "AWS API knowledge and Lambda-as-tool.",
    verdict: "Keep it. Complementary. Loses every conflict with InfraCop.",
  },
  {
    name: "aws-samples/sample-serverless-mcp-servers",
    url: "https://github.com/aws-samples/sample-serverless-mcp-servers",
    fit: "Stateless Streamable HTTP MCP on Lambda + API Gateway (Python).",
    verdict: "Remix the stateless HTTP Lambda adapter. We front it with an ALB in a dedicated VPC instead of API Gateway.",
  },
  {
    name: "Ran Isenberg aws-lambda-mcp-cookbook",
    url: "https://github.com/ran-isenberg/aws-lambda-mcp-cookbook",
    fit: "Production-leaning serverless MCP blueprint (CDK).",
    verdict: "Remix observability, IAM, and adapter patterns. We ship Terraform instead of CDK to match the consumers.",
  },
  {
    name: "Context7",
    url: "https://github.com/upstash/context7",
    fit: "Up-to-date public library docs for agents.",
    verdict: "Wrong problem. Public libraries, not a private standards repo.",
  },
  {
    name: "SPR terraform-ingest MCP",
    url: "https://spr.com/building-an-mcp-server-for-intelligent-terraform-module-ingestion-and-search/",
    fit: "RAG over custom Terraform modules.",
    verdict: "Remix module-chunking ideas later. Today the corpus is policy markdown, not modules.",
  },
  {
    name: "OpenRAG MCP",
    url: "https://github.com/mikethebot44",
    fit: "Generic RAG MCP on Pinecone + OpenAI.",
    verdict: "Wrong vector DB and embedding vendor for this AWS-private constraint.",
  },
] as const;

export const ARCHITECTURE_NODES = [
  {
    id: "account",
    title: "Dedicated AWS account",
    detail: "Own account, own VPC. No peering, no shared subnets, no sibling tools in the same blast radius.",
  },
  {
    id: "vpc",
    title: "Isolated VPC",
    detail: "10.42.0.0/16 across two AZs. Public subnets for ALB/NAT. Private subnets for Lambdas. Flow logs on.",
  },
  {
    id: "alb",
    title: "Application Load Balancer",
    detail: "Internet-facing TLS front door. /mcp and /health → MCP Lambda. /ingest → webhook Lambda. Only ingress.",
  },
  {
    id: "nat",
    title: "NAT Gateways",
    detail: "One per AZ. Private Lambdas reach Qdrant Cloud and GitHub without public IPs.",
  },
  {
    id: "endpoints",
    title: "VPC endpoints",
    detail: "Interface: Bedrock Runtime, Logs, Secrets, SQS, STS, monitoring. Gateway: S3. AWS APIs never hairpin NAT.",
  },
  {
    id: "github",
    title: "Standards repo",
    detail: "GitHub release of Ent-DevOps-Standards. Individual .md files.",
  },
  {
    id: "hook",
    title: "HTTPS webhook",
    detail: "ALB /ingest, HMAC-verified. DLQ on failure.",
  },
  {
    id: "ingest",
    title: "Ingest Lambda",
    detail: "Private subnet. Zipball → markdown chunk → Titan v2 → Qdrant upsert by rule id.",
  },
  {
    id: "qdrant",
    title: "Qdrant Cloud",
    detail: "Hybrid dense + BM25. Payload: domain, severity, release, heading.",
  },
  {
    id: "mcp",
    title: "MCP Lambda",
    detail: "Private subnet. FastMCP stateless HTTP. Provisioned concurrency 3. Reserved 25.",
  },
  {
    id: "agents",
    title: "20+ agents",
    detail: "Claude Code, Cursor, Copilot. InfraCop precedence 100 in instructions.",
  },
] as const;
