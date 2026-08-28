import { Badge } from "@/components/ui/badge";
import { CHUNKING_DECISION, EMBEDDING_MODELS, SIMILAR_SOLUTIONS } from "@/lib/research/content";

export function ResearchPage() {
  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Decision record</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Embeddings, chunking, prior art</h1>
        <p className="mt-3 text-muted leading-relaxed">
          The corpus is short, structured markdown with identifier-heavy rules
          (tag keys, env tokens, 47-char names). Retrieval quality, data
          residency, and Lambda-fit beat raw MTEB score.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-medium">Embedding model</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-elevated text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Verdict</th>
                <th className="px-4 py-3 font-medium">Dims</th>
                <th className="px-4 py-3 font-medium">Host</th>
                <th className="px-4 py-3 font-medium">Fit</th>
              </tr>
            </thead>
            <tbody>
              {EMBEDDING_MODELS.map((m) => (
                <tr key={m.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-fg">{m.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={m.verdict === "Recommended" ? "ok" : m.verdict === "Quality upgrade" ? "accent" : "default"}>
                      {m.verdict}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{m.dims}</td>
                  <td className="px-4 py-3 text-muted">{m.host}</td>
                  <td className="px-4 py-3 text-muted">{m.fit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Primary: Titan Text Embeddings V2 on Bedrock. Hybrid BM25 in Qdrant
          recovers exact keys the dense model might blur. Switch the dense model
          to voyage-code-3 later if the corpus grows into Terraform modules —
          the collection schema already stores <code className="font-mono text-accent">embedding_model</code> so a re-index is a new release, not a rewrite.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-medium">Chunking</h2>
        <p className="mt-2 font-mono text-sm text-accent">{CHUNKING_DECISION.strategy}</p>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {CHUNKING_DECISION.why.map((w) => (
            <li key={w} className="pl-4 before:mr-2 before:text-accent before:content-['–']">
              {w}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium">Similar solutions</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Nothing ready-made is a private GitHub-release-driven standards MCP
          with fail-closed Terraform validation and explicit precedence over
          HashiCorp/AWS MCPs. We remix three pieces and write the policy layer.
        </p>
        <ul className="mt-4 grid gap-3">
          {SIMILAR_SOLUTIONS.map((s) => (
            <li key={s.name} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={s.url} className="font-medium text-fg hover:text-accent" target="_blank" rel="noreferrer">
                  {s.name}
                </a>
                <span className="text-xs text-subtle">{s.fit}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{s.verdict}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
