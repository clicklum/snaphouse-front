import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Stat Card Skeleton ── */
export const StatCardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("rounded-lg border border-border bg-card p-5 space-y-3", className)}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-4 w-4 rounded" />
    </div>
    <Skeleton className="h-7 w-16" />
    <Skeleton className="h-3 w-24" />
  </div>
);

/* ── Table Row Skeleton ── */
export const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => (
  <div className="flex items-center gap-4 px-4 py-3">
    {Array.from({ length: cols }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn(
          "h-4 rounded",
          i === 0 ? "w-8 h-8 rounded-full shrink-0" : "",
          i === 1 ? "flex-1" : "",
          i === 2 ? "w-20 h-5 rounded-full" : "",
          i >= 3 ? "w-14" : "",
        )}
      />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5, className }: { rows?: number; cols?: number; className?: string }) => (
  <div className={cn("space-y-1", className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} cols={cols} />
    ))}
  </div>
);

/* ── Kanban Card Skeleton ── */
export const KanbanCardSkeleton = () => (
  <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-full" />
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-5 rounded-full ml-auto" />
    </div>
  </div>
);

export const KanbanColumnSkeleton = ({ cards = 3 }: { cards?: number }) => (
  <div className="min-w-[280px] w-[280px] shrink-0 space-y-3">
    <Skeleton className="h-5 w-24" />
    <div className="space-y-2 p-2 rounded-lg bg-muted/30 min-h-[200px]">
      {Array.from({ length: cards }).map((_, i) => (
        <KanbanCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

/* ── Chart Skeleton ── */
export const ChartSkeleton = ({ height = 250, className }: { height?: number; className?: string }) => (
  <div className={cn("w-full animate-pulse", className)} style={{ height }}>
    <div className="flex items-end gap-1.5 h-full px-2 pb-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-muted"
          style={{ height: `${20 + Math.sin(i * 0.8) * 30 + Math.random() * 25}%` }}
        />
      ))}
    </div>
  </div>
);

/* ── Full Page Loading ── */
export const PageSkeleton = ({ variant = "table" }: { variant?: "table" | "cards" | "kanban" | "chart" }) => (
  <div className="space-y-6 animate-fade-in">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Stats row */}
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Content area */}
    {variant === "table" && (
      <div className="rounded-lg border border-border">
        <TableSkeleton rows={6} cols={5} className="p-2" />
      </div>
    )}
    {variant === "cards" && (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )}
    {variant === "kanban" && (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <KanbanColumnSkeleton key={i} cards={2} />
        ))}
      </div>
    )}
    {variant === "chart" && (
      <div className="rounded-lg border border-border p-6">
        <ChartSkeleton />
      </div>
    )}
  </div>
);
