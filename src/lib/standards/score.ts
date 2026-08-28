import type { Finding } from "./inspector";

export type TrafficLight = "green" | "yellow" | "red";

export type ComplianceScore = {
  percent: number;
  light: TrafficLight;
  passed: number;
  failed: number;
  total: number;
  label: string;
  action: string;
};

export function scoreCompliance(findings: Pick<Finding, "severity">[]): ComplianceScore {
  const scored = findings.filter((f) => f.severity === "fail" || f.severity === "pass");
  const failed = scored.filter((f) => f.severity === "fail").length;
  const passed = scored.filter((f) => f.severity === "pass").length;
  const total = scored.length;
  const percent = total === 0 ? 0 : Math.round((passed / total) * 100);

  let light: TrafficLight;
  if (percent >= 100) light = "green";
  else if (percent >= 65) light = "yellow";
  else light = "red";

  const label =
    light === "green" ? "All compliant" : light === "yellow" ? "Improvement needed" : "Escalate";
  const action =
    light === "green"
      ? "Safe to certify and release."
      : light === "yellow"
        ? "Improvement plan required. Do not expand the footprint."
        : "Block production certification until the gap closes.";

  return { percent, light, passed, failed, total, label, action };
}
