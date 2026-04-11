import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <div className="rounded-xl border border-border overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 ${i !== rows - 1 ? "border-b border-border" : ""}`}
          >
            <Skeleton className="size-4 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
