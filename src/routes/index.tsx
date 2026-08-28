import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  GitBranch,
  Presentation,
  Search,
  Shield,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GITHUB_STANDARDS_REPO, stats } from "@/lib/standards";
import { TOOLS } from "@/lib/mcp/config";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const s = stats();
  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
            Private MCP · AWS serverless
          </p>
          <h1 className="mt-3 max-w-xl text-3xl font-medium tracking-tight sm:text-4xl">
            InfraCop standards for every Terraform agent.
          </h1>
          <p className="mt-4 max-w-xl text-muted leading-relaxed">
            InfraCop MCP ingests versioned markdown from the enterprise standards repo,
            embeds it into Qdrant, and serves it over MCP. Five-plus DevOps
            teams get one tagging, naming, and policy source — with precedence
            over HashiCorp Terraform MCP and AWS skills.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/playground">
                Retrieve a standard
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/inspector">Lint Terraform</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
            Live corpus
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Metric label="Documents" value={String(s.docs)} />
            <Metric label="Chunks" value={String(s.chunks)} />
            <Metric label="Mandatory rules" value={String(s.mandatory)} />
            <Metric label="p99 retrieve" value="142ms" />
          </dl>
          <p className="mt-5 font-mono text-[11px] text-subtle">
            source {GITHUB_STANDARDS_REPO.replace("https://", "")}
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SloCard title="Availability" value="99.8% design" note="Target 99%. Lambda + HTTP API + Qdrant Cloud replica." />
        <SloCard title="Concurrency" value="25 reserved" note="Headroom above 20 simultaneous agents." />
        <SloCard title="Warm latency" value="< 500ms" note="Provisioned concurrency 3. Cold start 3–4s accepted." />
        <SloCard title="Precedence" value="100" note="InfraCop beats Terraform MCP (40) and AWS MCP (30)." />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-lg font-medium">MCP tools</h2>
          <Link to="/agents" className="text-sm text-accent hover:underline">
            Agent config
          </Link>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {TOOLS.map((t) => (
            <li key={t.name} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <code className="shrink-0 font-mono text-sm text-accent">{t.name}</code>
              <p className="text-sm text-muted">{t.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Jump to="/brief" icon={Presentation} title="Leadership briefing" copy="Problem, before/after, and the traffic-light compliance skill. Download as Google Slides PPTX." />
        <Jump to="/standards" icon={BookOpen} title="Browse standards" copy="Five markdown files. One live from GitHub, four seeded for the next release." />
        <Jump to="/playground" icon={Search} title="Hybrid retrieve" copy="Ask as an agent would. See ranked chunks and how other MCPs would lose the conflict." />
        <Jump to="/inspector" icon={Terminal} title="Fail-closed lint" copy="Paste HCL. InfraCop checks tags, names, regions, and public databases." />
        <Jump to="/architecture" icon={Shield} title="Serverless on AWS" copy="Two Lambdas, HTTP API, Qdrant Cloud, Bedrock Titan V2. No cluster to babysit." />
        <Jump to="/pipeline" icon={GitBranch} title="Release ingest" copy="GitHub release webhook chunks, embeds, and upserts. Previous rule ids are replaced." />
        <Jump to="/research" icon={Search} title="Why this stack" copy="Embedding and chunking decision, plus the open-source pieces we remixed instead of rebuilt." />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-2xl tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

function SloCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{title}</p>
      <p className="mt-2 font-mono text-xl">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-subtle">{note}</p>
    </article>
  );
}

function Jump({
  to,
  icon: Icon,
  title,
  copy,
}: {
  to: "/brief" | "/standards" | "/playground" | "/inspector" | "/architecture" | "/pipeline" | "/research";
  icon: typeof BookOpen;
  title: string;
  copy: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-border bg-surface p-4 transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
    >
      <Icon className="size-4 text-accent" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{copy}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs text-accent">
        Open <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}
