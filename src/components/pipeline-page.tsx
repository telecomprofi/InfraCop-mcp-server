"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALL_CHUNKS, STANDARD_DOCS, chunkDocument } from "@/lib/standards";

const STEPS = [
  { t: "GitHub release published", d: "tag v1.0.1 on telecomprofi/Ent-DevOps-Standards" },
  { t: "Webhook HMAC verified", d: "X-Hub-Signature-256 against Secrets Manager" },
  { t: "Zipball fetched", d: "api.github.com/repos/.../zipball/v1.0.1" },
  { t: "Markdown-aware chunk", d: "H2/H3 split, 450 tokens, 80 overlap, parent section kept" },
  { t: "Titan V2 embed", d: "Bedrock, 1024-d, same model as query path" },
  { t: "Qdrant upsert", d: "point id = sha1(release + rule_id). Previous ids for that rule replaced" },
];

export function PipelinePage() {
  const [simulated, setSimulated] = useState(false);
  const preview = useMemo(() => STANDARD_DOCS.flatMap(chunkDocument).slice(0, 8), []);

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Ingest</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Release to Qdrant</h1>
        <p className="mt-3 text-muted leading-relaxed">
          A GitHub release is the unit of truth. Push-to-main can be enabled later
          for faster iteration; production agents always pin the latest release tag
          in the chunk payload.
        </p>
      </header>

      <ol className="space-y-2">
        {STEPS.map((s, i) => (
          <li
            key={s.t}
            className="flex gap-4 rounded-lg border border-border bg-surface px-4 py-3"
          >
            <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="text-sm font-medium">{s.t}</p>
              <p className="text-sm text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setSimulated(true)}>Simulate v1.0.1 ingest</Button>
        {simulated ? (
          <Badge tone="ok">
            upserted {ALL_CHUNKS.length} points · collection enterprise_standards
          </Badge>
        ) : (
          <span className="text-sm text-muted">Dry-run against the in-console corpus.</span>
        )}
      </div>

      <section>
        <h2 className="text-lg font-medium">Chunk preview</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-elevated text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 font-medium">Heading</th>
                <th className="px-4 py-3 font-medium">Sev</th>
                <th className="px-4 py-3 font-medium">Tok</th>
                <th className="px-4 py-3 font-medium">File</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-[11px] text-accent">{c.ruleId}</td>
                  <td className="px-4 py-3">{c.heading}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.severity === "mandatory" ? "danger" : "default"}>
                      {c.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted">{c.tokens}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-subtle">{c.filename}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
