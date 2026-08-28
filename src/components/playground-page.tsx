"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { composeAgentAnswer } from "@/lib/ai/compose";
import {
  competingAnswers,
  searchStandards,
  type Domain,
  type Severity,
} from "@/lib/standards";

const EXAMPLES = [
  "What tags are mandatory on an RDS instance?",
  "How should I name a production RDS database?",
  "Which metadata source wins for the Project tag?",
  "Can I set auto-stop on production?",
  "What CI jobs are required before merging Terraform?",
];

export function PlaygroundPage() {
  const [query, setQuery] = useState(EXAMPLES[0]!);
  const [domain, setDomain] = useState<Domain | "all">("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [submitted, setSubmitted] = useState(EXAMPLES[0]!);
  const [compose, setCompose] = useState<string | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const hits = useMemo(
    () => searchStandards({ query: submitted, domain, severity, limit: 5 }),
    [submitted, domain, severity],
  );
  const others = useMemo(() => competingAnswers(submitted), [submitted]);

  async function onCompose() {
    setPending(true);
    setComposeError(null);
    try {
      const res = await composeAgentAnswer({ data: { query: submitted } });
      if (res.ok) setCompose(res.text);
      else setComposeError(res.error);
    } catch {
      setComposeError("Composer failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">MCP retrieve</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Ask as an agent</h1>
        <p className="mt-3 text-muted leading-relaxed">
          This is the same hybrid retrieval the Python MCP tool{" "}
          <code className="font-mono text-accent">enterprise_get_standards</code> runs
          against Qdrant. Ranked chunks first; other MCPs shown below at lower
          precedence.
        </p>
      </header>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
          setCompose(null);
        }}
      >
        <label className="block text-sm text-muted" htmlFor="q">
          Query
        </label>
        <textarea
          id="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-elevated px-3 py-3 text-sm text-fg outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-3">
          <Select
            label="Domain"
            value={domain}
            onChange={(v) => setDomain(v as Domain | "all")}
            options={["all", "iac", "cicd", "observability", "security", "aws"]}
          />
          <Select
            label="Severity"
            value={severity}
            onChange={(v) => setSeverity(v as Severity | "all")}
            options={["all", "mandatory", "recommended", "optional"]}
          />
          <Button type="submit">Retrieve</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="h-11 rounded-full border border-border px-3 text-left text-xs text-muted hover:text-fg"
              onClick={() => {
                setQuery(ex);
                setSubmitted(ex);
                setCompose(null);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      <section className="grid gap-4 lg:grid-cols-3">
        {others.map((o) => (
          <article
            key={o.band}
            className={
              o.band === "infracop"
                ? "rounded-xl border border-accent/40 bg-accent-dim p-4"
                : "rounded-xl border border-border bg-surface p-4"
            }
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{o.source}</p>
              <Badge tone={o.band === "infracop" ? "accent" : "default"}>
                P{o.precedence}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{o.summary}</p>
            {o.band !== "infracop" && o.conflict ? (
              <p className="mt-3 text-[11px] uppercase tracking-wider text-danger">
                Loses on conflict
              </p>
            ) : null}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">
            {hits.length ? `${hits.length} chunks` : "No matching chunks"}
          </h2>
          <Button variant="secondary" onClick={onCompose} disabled={pending || !hits.length}>
            {pending ? "Composing…" : "Compose agent answer"}
          </Button>
        </div>
        {composeError ? <p className="text-sm text-danger">{composeError}</p> : null}
        {compose ? (
          <div className="whitespace-pre-wrap rounded-xl border border-accent/30 bg-accent-dim p-5 text-sm leading-relaxed">
            {compose}
          </div>
        ) : null}
        {hits.map((h) => (
          <article key={h.chunk.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={h.chunk.severity === "mandatory" ? "danger" : "accent"}>
                {h.chunk.severity}
              </Badge>
              <span className="font-mono text-[11px] text-subtle">{h.chunk.ruleId}</span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-muted">
                score {h.score.toFixed(2)}
              </span>
            </div>
            <h3 className="mt-2 font-medium">{h.chunk.heading}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
              {h.chunk.content.length > 700
                ? `${h.chunk.content.slice(0, 700)}…`
                : h.chunk.content}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-sm border border-border bg-elevated px-3 text-sm">
      <span className="text-muted">{label}</span>
      <select
        className="bg-transparent text-fg outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
