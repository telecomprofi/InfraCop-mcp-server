import type { Chunk, Severity, StandardDoc } from "./types";

const SEVERITY_HINTS: Array<[RegExp, Severity]> = [
  [/\b(MUST NOT|MUST|mandatory|forbidden|fails the|non-compliant)\b/i, "mandatory"],
  [/\b(SHOULD|recommended|optional, but good)\b/i, "recommended"],
  [/\b(MAY|optional)\b/i, "optional"],
];

function inferSeverity(heading: string, body: string): Severity {
  const text = `${heading}\n${body}`;
  for (const [re, sev] of SEVERITY_HINTS) {
    if (re.test(text)) return sev;
  }
  if (/^mandatory/i.test(heading)) return "mandatory";
  return "recommended";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length * 1.3));
}

/**
 * Markdown-header chunker mirroring the Python ingest path:
 * split on H2, keep H3 attached to the parent section, target ~450 tokens
 * with overlap only when a section is oversized.
 */
export function chunkDocument(doc: StandardDoc): Chunk[] {
  const lines = doc.markdown.split("\n");
  const sections: { heading: string; path: string[]; body: string[] }[] = [];
  let current = {
    heading: doc.title,
    path: [doc.title],
    body: [] as string[],
  };

  for (const line of lines) {
    const h2 = /^##\s+(.+)$/.exec(line);
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h2) {
      if (current.body.join("\n").trim()) sections.push(current);
      current = { heading: h2[1]!.trim(), path: [doc.title, h2[1]!.trim()], body: [] };
    } else if (h3) {
      current.body.push(line);
    } else {
      current.body.push(line);
    }
  }
  if (current.body.join("\n").trim()) sections.push(current);

  const chunks: Chunk[] = [];
  for (const section of sections) {
    const body = section.body.join("\n").trim();
    if (!body) continue;
    const pieces = splitOversized(body, 450);
    pieces.forEach((piece, index) => {
      const ruleId = `${doc.id}.${slugify(section.heading)}${pieces.length > 1 ? `.${index + 1}` : ""}`;
      chunks.push({
        id: `${doc.release}:${ruleId}`,
        docId: doc.id,
        filename: doc.filename,
        domain: doc.domain,
        heading: section.heading,
        headingPath: section.path,
        severity: inferSeverity(section.heading, piece),
        ruleId,
        content: piece,
        tokens: estimateTokens(piece),
        release: doc.release,
      });
    });
  }
  return chunks;
}

function splitOversized(text: string, targetTokens: number): string[] {
  if (estimateTokens(text) <= targetTokens) return [text];
  const paragraphs = text.split(/\n{2,}/);
  const out: string[] = [];
  let buf: string[] = [];
  for (const p of paragraphs) {
    const trial = [...buf, p].join("\n\n");
    if (buf.length && estimateTokens(trial) > targetTokens) {
      out.push(buf.join("\n\n"));
      buf = [p];
    } else {
      buf.push(p);
    }
  }
  if (buf.length) out.push(buf.join("\n\n"));
  return out;
}
