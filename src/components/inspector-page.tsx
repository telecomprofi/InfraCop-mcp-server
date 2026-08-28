"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  INSPECTOR_SAMPLES,
  findingCounts,
  inspectTerraform,
  scoreCompliance,
  type ComplianceScore,
  type Finding,
} from "@/lib/standards";

export function InspectorPage() {
  const [hcl, setHcl] = useState(INSPECTOR_SAMPLES.noncompliant);
  const [dir, setDir] = useState("production");
  const [submitted, setSubmitted] = useState({
    hcl: INSPECTOR_SAMPLES.noncompliant,
    dir: "production",
  });

  const findings = useMemo(
    () => inspectTerraform(submitted.hcl, submitted.dir),
    [submitted],
  );
  const counts = findingCounts(findings);
  const score = scoreCompliance(findings);

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
          enterprise_validate_terraform
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Terraform inspector</h1>
        <p className="mt-3 text-muted leading-relaxed">
          Fail-closed lint against InfraCop rules, plus the leadership
          traffic-light. Green is 100% of mandatory checks. Yellow is 65–85%.
          Red is below 65%. Agents must not ship a snippet that still has fail
          findings. Same checks the MCP tools run in AWS.
        </p>
      </header>

      <form
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted({ hcl, dir });
        }}
      >
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setHcl(INSPECTOR_SAMPLES.noncompliant)}
            >
              Load non-compliant
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setHcl(INSPECTOR_SAMPLES.compliant)}
            >
              Load compliant
            </Button>
            <label className="ml-auto flex h-9 items-center gap-2 rounded-sm border border-border px-3 text-xs">
              Directory
              <select
                className="bg-transparent text-fg outline-none"
                value={dir}
                onChange={(e) => setDir(e.target.value)}
              >
                {["production", "staging", "uat", "dev", "qa"].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            value={hcl}
            onChange={(e) => setHcl(e.target.value)}
            spellCheck={false}
            className="h-[420px] w-full rounded-xl border border-border bg-elevated p-4 font-mono text-[12px] leading-5 text-fg outline-none focus:border-accent"
          />
          <Button type="submit" className="mt-3">
            Validate
          </Button>
        </div>
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <TrafficChip score={score} />
            <Badge tone="danger">{counts.fail} fail</Badge>
            <Badge tone="warn">{counts.warn} warn</Badge>
            <Badge tone="ok">{counts.pass} pass</Badge>
          </div>
          <ul className="space-y-2">
            {findings.map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </ul>
        </div>
      </form>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const tone =
    finding.severity === "fail" ? "danger" : finding.severity === "warn" ? "warn" : "ok";
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{finding.severity}</Badge>
        <span className="font-mono text-[11px] text-subtle">{finding.ruleId}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{finding.title}</p>
      <p className="mt-1 text-sm text-muted">{finding.detail}</p>
      {finding.excerpt ? (
        <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-accent">
          {finding.excerpt}
        </pre>
      ) : null}
    </li>
  );
}

function TrafficChip({ score }: { score: ComplianceScore }) {
  const tone = score.light === "green" ? "ok" : score.light === "yellow" ? "warn" : "danger";
  const name = score.light === "green" ? "Green" : score.light === "yellow" ? "Yellow" : "Red";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={tone}>
        {name} {score.percent}%
      </Badge>
      <span className="text-xs text-muted">
        {score.passed}/{score.total} mandatory · {score.label}
      </span>
    </div>
  );
}
