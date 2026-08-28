"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  GitBranch,
  Layers,
  LayoutGrid,
  Menu,
  Presentation,
  Radar,
  Search,
  Shield,
  Terminal,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { stats } from "@/lib/standards";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid },
  { to: "/brief", label: "Briefing", icon: Presentation },
  { to: "/standards", label: "Standards", icon: BookOpen },
  { to: "/playground", label: "Retrieve", icon: Search },
  { to: "/inspector", label: "Inspector", icon: Terminal },
  { to: "/architecture", label: "Architecture", icon: Layers },
  { to: "/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/agents", label: "Agents", icon: Shield },
  { to: "/research", label: "Research", icon: Radar },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const s = stats();

  if (pathname === "/brief") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-sm border border-border text-muted lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-sm bg-accent font-mono text-[11px] font-medium text-accent-fg">
              IC
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-medium tracking-tight">InfraCop</span>
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">
                MCP
              </span>
            </span>
          </Link>
          <div className="ml-auto hidden items-center gap-4 text-xs text-muted sm:flex">
            <StatusDot ok label="Qdrant" />
            <span className="font-mono tabular-nums">
              {s.chunks} chunks · {s.docs} docs
            </span>
            <span className="rounded-full border border-ok/30 bg-ok-dim px-2 py-1 font-mono text-ok">
              p99 142ms
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside
          className={cn(
            "z-30 w-60 shrink-0 border-r border-border bg-bg px-3 py-4",
            open ? "fixed inset-y-14 left-0" : "hidden lg:block",
          )}
        >
          <nav className="flex flex-col gap-0.5" aria-label="Primary">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-sm px-3 text-sm transition-colors duration-150",
                    active
                      ? "bg-elevated text-fg"
                      : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="mt-8 px-3 text-[11px] leading-relaxed text-subtle">
            Private MCP for Terraform agents. InfraCop answers override HashiCorp and AWS
            MCPs on conflict.
          </p>
        </aside>

        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-bg/60 lg:hidden"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <main id="main" className="min-w-0 flex-1 px-4 py-6 pb-16 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn("size-1.5 rounded-full", ok ? "bg-ok" : "bg-danger")}
        aria-hidden
      />
      {label}
    </span>
  );
}
