export type Domain = "iac" | "cicd" | "observability" | "security" | "aws";

export type Severity = "mandatory" | "recommended" | "optional";

export type SourceKind = "github" | "seed";

export type StandardDoc = {
  id: string;
  filename: string;
  title: string;
  domain: Domain;
  version: string;
  release: string;
  source: SourceKind;
  githubPath: string;
  summary: string;
  markdown: string;
  updatedAt: string;
};

export type Chunk = {
  id: string;
  docId: string;
  filename: string;
  domain: Domain;
  heading: string;
  headingPath: string[];
  severity: Severity;
  ruleId: string;
  content: string;
  tokens: number;
  release: string;
};

export type RetrievalHit = {
  chunk: Chunk;
  score: number;
  lexical: number;
  headingBoost: number;
};

export type PrecedenceBand = "infracop" | "terraform-mcp" | "aws-mcp";

export type CompetingAnswer = {
  band: PrecedenceBand;
  precedence: number;
  source: string;
  summary: string;
  conflict: boolean;
};
