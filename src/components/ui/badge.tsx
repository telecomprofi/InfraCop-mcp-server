import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      tone: {
        default: "bg-elevated text-muted border border-border",
        accent: "bg-accent-dim text-accent border border-accent/25",
        ok: "bg-ok-dim text-ok border border-ok/25",
        warn: "bg-warn-dim text-warn border border-warn/25",
        danger: "bg-danger-dim text-danger border border-danger/25",
        github: "bg-elevated text-fg border border-border",
        seed: "bg-warn-dim text-warn border border-warn/25",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
