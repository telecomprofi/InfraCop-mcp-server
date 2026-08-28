import { ARCHITECTURE_NODES } from "@/lib/research/content";

export function ArchitecturePage() {
  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">AWS</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Isolated control plane</h1>
        <p className="mt-3 text-muted leading-relaxed">
          Two Lambdas in private subnets, an internet-facing ALB, dual-AZ NAT,
          and VPC endpoints — in a dedicated AWS account. Qdrant Cloud and
          Bedrock Titan V2. No EKS, no RDS. Designed for 99% availability, 20
          simultaneous agents, and warm p99 under 500ms.
        </p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ARCHITECTURE_NODES.map((n, i) => (
          <li key={n.id} className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-[11px] text-accent">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-2 font-medium">{n.title}</h2>
            <p className="mt-1 text-sm text-muted">{n.detail}</p>
          </li>
        ))}
      </ol>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-medium">NFR mapping</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="pb-3 font-medium">Requirement</th>
                <th className="pb-3 font-medium">How</th>
                <th className="pb-3 font-medium">Headroom</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-t border-border">
                <td className="py-3 text-fg">99% availability</td>
                <td className="py-3">Lambda 99.95% + ALB 99.99% + NAT per AZ + Qdrant Cloud replica. Multi-AZ VPC.</td>
                <td className="py-3 font-mono text-xs">~99.8% design vs 7.3h/month budget</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-3 text-fg">Minimum infra</td>
                <td className="py-3">No ECS/EKS. Dedicated VPC/ALB/NAT for account isolation. Qdrant Cloud. Bedrock embeddings.</td>
                <td className="py-3 font-mono text-xs">about 230-290 USD / month with HA NAT + Qdrant</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-3 text-fg">20 simultaneous agents</td>
                <td className="py-3">Reserved concurrency 25 on the MCP Lambda. ALB scales independently.</td>
                <td className="py-3 font-mono text-xs">burst well above 20</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-3 text-fg">Warm p99 under 500ms</td>
                <td className="py-3">Provisioned concurrency 3, ARM64 1024MB, Titan ~80ms, Qdrant HNSW ~10ms, no LLM on the retrieve path.</td>
                <td className="py-3 font-mono text-xs">budget about 400ms leftover</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-3 text-fg">Cold start 3-4s</td>
                <td className="py-3">Accepted by the brief. First request after scale-from-zero; provisioned line stays warm.</td>
                <td className="py-3 font-mono text-xs">Mangum + FastMCP container image</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-medium">Private by default</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Internet-facing ALB is the only ingress. Per-team API keys checked in the Lambda. Restrict allowed_ingress_cidrs in production.</li>
            <li>Lambdas have no public IPs. Outbound to Qdrant and GitHub via NAT. Bedrock, Logs, Secrets, SQS stay on VPC endpoints.</li>
            <li>Dedicated AWS account — no VPC peering, no shared subnets, no sibling tools in this blast radius.</li>
            <li>Qdrant API key and GitHub webhook secret in Secrets Manager. Embeddings stay in-account on Bedrock.</li>
          </ul>
        </article>
        <article className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-medium">Deploy shape</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Terraform in <code className="font-mono text-accent">infra/terraform</code> — VPC, NAT, ALB, two Lambdas, endpoints, IAM, alarms, DLQ.</li>
            <li>Python package in <code className="font-mono text-accent">mcp-server</code> — FastMCP, LangChain Qdrant, Bedrock embeddings, fail-closed validator.</li>
            <li>Ingest Lambda shares the chunker with the console so a release cannot drift from what agents retrieve.</li>
            <li>CloudWatch p99 + 5xx + ingest-lag alarms; traces via X-Ray.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
