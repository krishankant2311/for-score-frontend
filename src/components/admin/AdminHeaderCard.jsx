"use client";

import { cn } from "@/lib/utils";

export default function AdminHeaderCard({
  title,
  subtitle,
  stats,
  actions,
  className = "",
}) {
  return (
    <div className={cn("surface-card overflow-hidden", className)}>
      <div className="px-5 py-4 md:px-6 md:py-5 bg-gradient-to-r from-emerald-50 via-background to-amber-50/50 dark:from-emerald-950/35 dark:via-background dark:to-amber-950/15 border-b border-border">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            {stats ? <div className="mt-2">{stats}</div> : null}
          </div>
          {actions ? (
            <div className="shrink-0 flex justify-end md:block">{actions}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

