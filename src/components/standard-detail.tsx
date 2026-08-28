import { Link, notFound, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownView } from "@/components/MarkdownView";
import { STANDARD_DOCS, chunksByDoc } from "@/lib/standards";

export function StandardDetail() {
  const { slug } = useParams({ from: "/standards/$slug" });
  const doc = STANDARD_DOCS.find((d) => d.id === slug);
  if (!doc) throw notFound();
  const chunks = chunksByDoc(doc.id);

  return (
    <div className="space-y-6">
      <Link
        to="/standards"
        className="inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Catalog
      </Link>
      <header className="max-w-3xl">
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{doc.domain}</Badge>
          <Badge tone={doc.source === "github" ? "ok" : "seed"}>
            {doc.source === "github" ? "from GitHub" : "seeded pending release"}
          </Badge>
          <Badge>{doc.release}</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">{doc.title}</h1>
        <p className="mt-2 text-muted">{doc.summary}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <article className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <MarkdownView markdown={doc.markdown} />
        </article>
        <aside className="h-fit rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Chunks</p>
          <ul className="mt-3 space-y-2">
            {chunks.map((c) => (
              <li key={c.id} className="text-sm">
                <p className="text-fg">{c.heading}</p>
                <p className="font-mono text-[11px] text-subtle">
                  {c.ruleId} · {c.severity} · {c.tokens} tok
                </p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
