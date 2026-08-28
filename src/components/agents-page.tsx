"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  INFRACOP_INSTRUCTIONS,
  CLAUDE_MD,
  CURSOR_RULE,
  MCP_JSON,
  TOOLS,
} from "@/lib/mcp/config";

export function AgentsPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Precedence 100</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Wire the agents</h1>
        <p className="mt-3 text-muted leading-relaxed">
          MCP clients do not honour config-file order as priority. Precedence is
          enforced in three places at once: server instructions, tool names and
          descriptions, and a repo-level AGENTS.md / Cursor rule that every
          infrastructure repository copies.
        </p>
      </header>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">1. Server</p>
          <p className="mt-2 text-sm text-muted">
            FastMCP <code className="font-mono text-accent">instructions</code> tell
            the client that InfraCop overrides Terraform MCP and AWS MCP on conflict.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">2. Tools</p>
          <p className="mt-2 text-sm text-muted">
            Names are prefixed <code className="font-mono text-accent">enterprise_*</code>.
            Every response includes <code className="font-mono text-accent">precedence: 100</code>.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">3. Repo rules</p>
          <p className="mt-2 text-sm text-muted">
            CLAUDE.md, AGENTS.md, and a Cursor rule with{" "}
            <code className="font-mono text-accent">alwaysApply: true</code> in every IaC repo.
          </p>
        </article>
      </section>

      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {TOOLS.map((t) => (
          <li key={t.name} className="px-5 py-4">
            <code className="font-mono text-sm text-accent">{t.name}</code>
            <p className="mt-1 text-sm text-muted">{t.summary}</p>
          </li>
        ))}
      </ul>

      <CopyBlock title="Claude Code / Cursor mcp.json" code={JSON.stringify(MCP_JSON, null, 2)} />
      <CopyBlock title="MCP server instructions" code={INFRACOP_INSTRUCTIONS.trim()} />
      <CopyBlock title="CLAUDE.md / AGENTS.md" code={CLAUDE_MD.trim()} />
      <CopyBlock title=".cursor/rules/enterprise-standards.mdc" code={CURSOR_RULE.trim()} />
    </div>
  );
}

function CopyBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-border bg-elevated p-4 font-mono text-[12px] leading-5 text-accent">
        {code}
      </pre>
    </section>
  );
}
