import { chunkDocument } from "./chunker";
import { STANDARD_DOCS } from "./corpus";
import type { Chunk, CompetingAnswer, Domain, RetrievalHit, Severity } from "./types";

const SYNONYMS: Record<string, string[]> = {
  tag: ["tags", "tagging", "label", "labels", "common_tags"],
  tags: ["tag", "tagging", "label", "common_tags"],
  naming: ["name", "names", "convention", "kebab", "skewer"],
  name: ["naming", "identifier", "resource name"],
  rds: ["database", "postgres", "mysql", "rds-db"],
  vpc: ["network", "subnet", "nat"],
  env: ["environment", "uat", "staging", "prod", "production"],
  environment: ["env", "uat", "staging"],
  datadog: ["dd", "observability", "monitoring", "security center"],
  opa: ["conftest", "policy", "rego"],
  s3: ["bucket", "object storage"],
  secret: ["secrets", "password", "token", "ssm"],
  encryption: ["kms", "cmk", "tls", "at rest"],
  auto: ["holiday-pause", "auto-stop", "weekend"],
  catalog: ["catalog-info", "backstage", "metadata"],
};

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "for",
  "in",
  "on",
  "with",
  "by",
  "is",
  "are",
  "be",
  "as",
  "that",
  "this",
  "it",
  "from",
  "at",
  "should",
  "must",
  "how",
  "what",
  "when",
  "do",
  "i",
  "we",
]);

export const ALL_CHUNKS: Chunk[] = STANDARD_DOCS.flatMap(chunkDocument);

const AVG_DL =
  ALL_CHUNKS.reduce((sum, c) => sum + tokenize(c.content).length, 0) /
  Math.max(1, ALL_CHUNKS.length);

const DF = new Map<string, number>();
for (const chunk of ALL_CHUNKS) {
  const unique = new Set(tokenize(`${chunk.heading} ${chunk.content} ${chunk.ruleId}`));
  for (const t of unique) DF.set(t, (DF.get(t) ?? 0) + 1);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9:_./-]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function expandQuery(terms: string[]): string[] {
  const extra: string[] = [];
  for (const t of terms) {
    const syn = SYNONYMS[t];
    if (syn) extra.push(...syn);
  }
  return [...new Set([...terms, ...extra])];
}

function idf(term: string): number {
  const n = ALL_CHUNKS.length;
  const df = DF.get(term) ?? 0.5;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

function bm25(chunk: Chunk, terms: string[]): { lexical: number; headingBoost: number } {
  const body = tokenize(chunk.content);
  const heading = tokenize(chunk.heading);
  const k1 = 1.2;
  const b = 0.75;
  const tf = (tokens: string[], term: string) => tokens.filter((t) => t === term).length;
  let lexical = 0;
  let headingBoost = 0;
  for (const term of terms) {
    const f = tf(body, term);
    if (f) {
      lexical +=
        idf(term) * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (body.length / AVG_DL))));
    }
    const hf = tf(heading, term);
    if (hf) headingBoost += 2.4 * idf(term);
    if (chunk.ruleId.toLowerCase().includes(term)) headingBoost += 1.6;
    if (chunk.filename.toLowerCase().includes(term)) headingBoost += 0.6;
  }
  if (chunk.severity === "mandatory") lexical *= 1.08;
  return { lexical, headingBoost };
}

export type SearchOpts = {
  query: string;
  domain?: Domain | "all";
  severity?: Severity | "all";
  limit?: number;
};

export function searchStandards(opts: SearchOpts): RetrievalHit[] {
  const terms = expandQuery(tokenize(opts.query));
  if (!terms.length) return [];
  const hits: RetrievalHit[] = [];
  for (const chunk of ALL_CHUNKS) {
    if (opts.domain && opts.domain !== "all" && chunk.domain !== opts.domain) continue;
    if (opts.severity && opts.severity !== "all" && chunk.severity !== opts.severity) continue;
    const { lexical, headingBoost } = bm25(chunk, terms);
    const score = lexical + headingBoost;
    if (score > 0.15) hits.push({ chunk, score, lexical, headingBoost });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, opts.limit ?? 5);
}

export function competingAnswers(query: string): CompetingAnswer[] {
  const q = query.toLowerCase();
  const aboutTags = /tag|label|owner|cost/.test(q);
  const aboutNaming = /nam(e|ing)|convention|kebab/.test(q);
  const aboutRds = /rds|database|postgres/.test(q);
  const aboutObs = /datadog|monitor|observ|trace|log/.test(q);

  const terraform = aboutTags
    ? "AWS provider docs show optional tags = { Name = ... } examples. No org-wide required keys."
    : aboutNaming
      ? "HashiCorp tutorials use generic names like 'example' and 'main'. No 47-char or env-token rule."
      : aboutRds
        ? "Terraform Registry aws_db_instance examples omit default_tags and Datadog routing tags."
        : "Generic Terraform Registry module guidance. Not organisation-specific.";

  const aws = aboutTags
    ? "AWS tagging strategy whitepaper recommends cost-allocation tags but leaves keys to the customer."
    : aboutObs
      ? "AWS Distro for OpenTelemetry is suggested. No Datadog Security Center contract."
      : aboutRds
        ? "AWS Well-Architected says encrypt RDS and avoid public access. Does not encode catalog-info.yaml or Project:org prefix."
        : "AWS service docs and Well-Architected. Complementary, not canonical for this org.";

  return [
    {
      band: "infracop",
      precedence: 100,
      source: "InfraCop MCP",
      summary:
        "Mandatory org standard. Overrides HashiCorp Terraform MCP and AWS MCP whenever they conflict.",
      conflict: true,
    },
    {
      band: "terraform-mcp",
      precedence: 40,
      source: "HashiCorp Terraform MCP",
      summary: terraform,
      conflict: aboutTags || aboutNaming || aboutRds,
    },
    {
      band: "aws-mcp",
      precedence: 30,
      source: "AWS / agentic skills MCP",
      summary: aws,
      conflict: aboutTags || aboutObs || aboutRds,
    },
  ];
}

export function chunksByDoc(docId: string): Chunk[] {
  return ALL_CHUNKS.filter((c) => c.docId === docId);
}

export function stats() {
  const mandatory = ALL_CHUNKS.filter((c) => c.severity === "mandatory").length;
  return {
    docs: STANDARD_DOCS.length,
    chunks: ALL_CHUNKS.length,
    mandatory,
    tokens: ALL_CHUNKS.reduce((s, c) => s + c.tokens, 0),
    githubDocs: STANDARD_DOCS.filter((d) => d.source === "github").length,
    seedDocs: STANDARD_DOCS.filter((d) => d.source === "seed").length,
  };
}
