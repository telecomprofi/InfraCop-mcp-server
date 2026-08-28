import { cn } from "@/lib/utils";

export function MarkdownView({ markdown, className }: { markdown: string; className?: string }) {
  const parts = splitFences(markdown);
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed text-fg", className)}>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-md bg-bg p-4 font-mono text-[12px] leading-5 text-accent"
          >
            <code>{part.value}</code>
          </pre>
        ) : (
          <Block key={i} text={part.value} />
        ),
      )}
    </div>
  );
}

function splitFences(src: string): { type: "code" | "text"; value: string }[] {
  const out: { type: "code" | "text"; value: string }[] = [];
  const re = /```[\w]*\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ type: "text", value: src.slice(last, m.index) });
    out.push({ type: "code", value: m[1]!.trimEnd() });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ type: "text", value: src.slice(last) });
  return out;
}

function Block({ text }: { text: string }) {
  const lines = text.trim().split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (/^#\s+/.test(line))
          return (
            <h2 key={i} className="font-sans text-xl font-medium tracking-tight">
              {line.replace(/^#\s+/, "")}
            </h2>
          );
        if (/^##\s+/.test(line))
          return (
            <h3 key={i} className="pt-2 font-sans text-base font-medium">
              {line.replace(/^##\s+/, "")}
            </h3>
          );
        if (/^###\s+/.test(line))
          return (
            <h4 key={i} className="font-sans text-sm font-medium text-accent">
              {line.replace(/^###\s+/, "")}
            </h4>
          );
        if (/^\|\s/.test(line)) {
          if (/^\|\s*-+/.test(line)) return null;
          const cells = line.split("|").filter((c) => c.trim().length);
          const isHeader = i > 0 && /^\|\s*-+/.test(lines[i + 1] ?? "");
          return (
            <div
              key={i}
              className={cn(
                "grid gap-2 font-mono text-[12px]",
                isHeader ? "text-muted" : "text-fg",
              )}
              style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
            >
              {cells.map((c, j) => (
                <span key={j}>{c.trim()}</span>
              ))}
            </div>
          );
        }
        if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
          return (
            <p key={i} className="pl-4 text-muted before:mr-2 before:text-accent before:content-['–']">
              {line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")}
            </p>
          );
        if (!line.trim()) return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-muted">
            {line}
          </p>
        );
      })}
    </div>
  );
}
