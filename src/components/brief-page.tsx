"use client";

import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DECK, type DeckSlide, type TrafficLight } from "@/lib/brief/deck";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PPTX = "/infracop-leadership-brief.pptx";

export function BriefPage() {
  const [i, setI] = useState(0);
  const slide = DECK.slides[i]!;
  const last = DECK.slides.length - 1;

  const go = useCallback(
    (n: number) => setI(Math.max(0, Math.min(last, n))),
    [last],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(i + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(last);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, i, last]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <span className="flex size-8 items-center justify-center rounded-sm bg-accent font-mono text-[11px] font-medium text-accent-fg">
          IC
        </span>
        <span className="text-sm font-medium">InfraCop briefing</span>
        <span className="hidden font-mono text-xs text-muted sm:inline">
          {String(i + 1).padStart(2, "0")} / {String(DECK.slides.length).padStart(2, "0")}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <a href={PPTX} download>
              <Download />
              Google Slides PPTX
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/" aria-label="Back to console">
              <X />
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-stretch justify-center p-3 sm:p-6">
          <article
            className={cn(
              "flex w-full max-w-6xl flex-col overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] sm:p-8",
              slide.layout === "diagram" ? "min-h-0 flex-1 lg:p-6" : "lg:aspect-video lg:p-10",
            )}
            onClick={(e) => {
              if (slide.layout === "diagram") return;
              const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
              const w = e.currentTarget.getBoundingClientRect().width;
              if (x > w * 0.62) go(i + 1);
              else if (x < w * 0.38) go(i - 1);
            }}
          >
            <SlideBody slide={slide} />
            {slide.layout === "diagram" ? null : (
              <p className="mt-auto pt-6 font-mono text-[11px] text-subtle">
                InfraCop MCP · confidential · tech leadership
              </p>
            )}
          </article>
        </div>

        <nav className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3">
          <Button variant="secondary" onClick={() => go(i - 1)} disabled={i === 0}>
            <ChevronLeft />
            Previous
          </Button>
          <ol className="hidden items-center gap-1 md:flex" aria-label="Slides">
            {DECK.slides.map((s, idx) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-label={`Slide ${idx + 1}: ${s.title}`}
                  aria-current={idx === i}
                  onClick={() => go(idx)}
                  className={cn(
                    "size-2.5 rounded-full",
                    idx === i ? "bg-accent" : "bg-border hover:bg-muted",
                  )}
                />
              </li>
            ))}
          </ol>
          <Button onClick={() => go(i + 1)} disabled={i === last}>
            Next
            <ChevronRight />
          </Button>
        </nav>
      </div>
    </div>
  );
}

function SlideBody({ slide }: { slide: DeckSlide }) {
  switch (slide.layout) {
    case "title":
      return (
        <div className="flex max-w-3xl flex-1 flex-col justify-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent">{slide.kicker}</p>
          <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl">{slide.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {slide.subtitle}
          </p>
          <p className="mt-8 font-mono text-xs text-subtle">{slide.meta}</p>
        </div>
      );
    case "agenda":
      return (
        <div>
          <Kicker kicker={slide.kicker} title={slide.title} />
          <ol className="mt-8 space-y-4">
            {slide.items.map((item) => (
              <li key={item.n} className="flex items-baseline gap-4 border-b border-border pb-4">
                <span className="font-mono text-sm text-accent">{item.n}</span>
                <span className="text-lg">{item.label}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "cards":
      return (
        <div>
          <Kicker kicker={slide.kicker} title={slide.title} />
          {slide.lede ? <p className="mt-3 max-w-3xl text-sm text-muted">{slide.lede}</p> : null}
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {slide.cards.map((c) => (
              <li key={c.title} className="rounded-lg border border-border bg-elevated p-4">
                <p className="font-medium">{c.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    case "quote":
      return (
        <div>
          <Kicker kicker={slide.kicker} title={slide.title} />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {slide.examples.map((ex) => (
              <li key={ex.bad} className="rounded-lg border border-border bg-elevated p-4">
                <code className="font-mono text-lg text-danger">{ex.bad}</code>
                <p className="mt-2 text-sm text-muted">{ex.why}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-3xl text-sm text-muted">{slide.note}</p>
        </div>
      );
    case "split":
      return (
        <div>
          <Kicker kicker={slide.kicker} title={slide.title} />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Column title={slide.leftTitle} items={slide.left} tone="warn" />
            <Column title={slide.rightTitle} items={slide.right} tone="ok" />
          </div>
        </div>
      );
    case "flow":
      return (
        <div>
          <Kicker kicker={slide.kicker} title={slide.title} />
          <ol className="mt-6 grid gap-3 sm:grid-cols-2">
            {slide.steps.map((s) => (
              <li key={s.n} className="rounded-lg border border-border bg-elevated p-4">
                <p className="font-mono text-xs text-accent">{s.n}</p>
                <p className="mt-2 font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      );
    case "lights":
      return (
        <div>
          <Kicker kicker={slide.kicker} title={slide.title} />
          <p className="mt-3 max-w-3xl text-sm text-muted">{slide.lede}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {slide.bands.map((b) => (
              <li key={b.light} className="rounded-lg border border-border bg-elevated p-4">
                <LightDot light={b.light} />
                <p className="mt-3 font-mono text-lg">{b.range}</p>
                <p className="mt-2 text-sm text-muted">{b.meaning}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-subtle">{slide.footnote}</p>
        </div>
      );
    case "scorecard":
      return (
        <div>
          <Kicker kicker={slide.kicker} title={slide.title} />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium">Account</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Light</th>
                  <th className="pb-3 font-medium">Gap</th>
                </tr>
              </thead>
              <tbody>
                {slide.rows.map((r) => (
                  <tr key={r.project} className="border-t border-border">
                    <td className="py-3 font-medium">{r.project}</td>
                    <td className="py-3 font-mono text-xs text-muted">{r.account}</td>
                    <td className="py-3 font-mono tabular-nums">{r.percent}%</td>
                    <td className="py-3">
                      <LightDot light={r.light} />
                    </td>
                    <td className="py-3 text-muted">{r.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "table":
      return (
        <div>
          <Kicker kicker={slide.kicker} title={slide.title} />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
                <tr>
                  {slide.headers.map((h) => (
                    <th key={h} className="pb-3 pr-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slide.rows.map((row) => (
                  <tr key={row[0]} className="border-t border-border align-top">
                    <td className="py-3 pr-4 text-muted">{row[0]}</td>
                    <td className="py-3 text-fg">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "ask":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <Kicker kicker={slide.kicker} title={slide.title} />
          <ol className="mt-6 max-w-3xl space-y-3">
            {slide.items.map((item, idx) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span className="font-mono text-accent">{String(idx + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-2xl text-lg font-medium">{slide.close}</p>
        </div>
      );
    case "diagram":
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent">{slide.kicker}</p>
          <h1 className="mt-1 text-xl font-medium tracking-tight sm:text-2xl">{slide.title}</h1>
          <p className="mt-1 max-w-3xl text-xs text-muted sm:text-sm">{slide.lede}</p>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
            {slide.lanes.map((lane) => (
              <section
                key={lane.n}
                className="flex min-h-0 flex-1 flex-col justify-center rounded-lg border border-border bg-elevated px-2.5 py-1.5"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                  {lane.n} · {lane.label}
                </p>
                <ol className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
                  {lane.nodes.map((node) => (
                    <li
                      key={node.title}
                      className="rounded-md border border-border bg-surface px-2.5 py-1.5"
                    >
                      <p className="text-sm font-medium leading-snug">{node.title}</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted">{node.copy}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
      );
  }
}

function Kicker({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.18em] text-accent">{kicker}</p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">{title}</h1>
    </>
  );
}

function Column({ title, items, tone }: { title: string; items: string[]; tone: "warn" | "ok" }) {
  return (
    <div className="rounded-lg border border-border bg-elevated p-5">
      <p className={cn("text-sm font-medium", tone === "ok" ? "text-ok" : "text-warn")}>{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LightDot({ light }: { light: TrafficLight }) {
  const label = light === "green" ? "Green" : light === "yellow" ? "Yellow" : "Red";
  const cls =
    light === "green" ? "bg-ok" : light === "yellow" ? "bg-warn" : "bg-danger";
  const text =
    light === "green" ? "text-ok" : light === "yellow" ? "text-warn" : "text-danger";
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", text)}>
      <span className={cn("size-2.5 rounded-full", cls)} aria-hidden />
      {label}
    </span>
  );
}
