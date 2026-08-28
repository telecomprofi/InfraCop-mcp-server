import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { STANDARD_DOCS, chunksByDoc } from "@/lib/standards";

const DOMAIN_LABEL: Record<string, string> = {
  iac: "IaC",
  cicd: "CI/CD",
  observability: "Observability",
  security: "Security",
  aws: "AWS",
};

export function StandardsPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Corpus</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Standards catalog</h1>
        <p className="mt-3 text-muted leading-relaxed">
          Individual markdown files in{" "}
          <a
            className="text-accent hover:underline"
            href="https://github.com/telecomprofi/Ent-DevOps-Standards"
            target="_blank"
            rel="noreferrer"
          >
            Ent-DevOps-Standards
          </a>
          . A GitHub release re-chunks the lot. Seeded files match the README
          contract and will be replaced on first publish.
        </p>
      </header>
      <ul className="grid gap-3">
        {STANDARD_DOCS.map((doc) => {
          const chunks = chunksByDoc(doc.id);
          return (
            <li key={doc.id}>
              <Link
                to="/standards/$slug"
                params={{ slug: doc.id }}
                className="block rounded-xl border border-border bg-surface p-5 transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{DOMAIN_LABEL[doc.domain]}</Badge>
                  <Badge tone={doc.source === "github" ? "ok" : "seed"}>
                    {doc.source === "github" ? "from GitHub" : "seeded"}
                  </Badge>
                  <span className="font-mono text-[11px] text-subtle">{doc.filename}</span>
                </div>
                <h2 className="mt-3 text-lg font-medium">{doc.title}</h2>
                <p className="mt-1 text-sm text-muted">{doc.summary}</p>
                <p className="mt-3 font-mono text-[11px] text-subtle">
                  {chunks.length} chunks · {doc.release} · updated {doc.updatedAt}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
