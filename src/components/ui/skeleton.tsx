import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[#1e1e2e]",
        className
      )}
    />
  );
}

export function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-[#1e1e2e]">
      {Array.from({ length: count }).map((_, i) => (
        <TransactionSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Row 1: 3 cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-3 text-center">
          <Skeleton className="h-3 w-12 mx-auto mb-2" />
          <Skeleton className="h-5 w-14 mx-auto" />
        </div>
      ))}
      {/* Row 2: Full width balance card */}
      <div className="col-span-3 rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-3 text-center">
        <Skeleton className="h-3 w-12 mx-auto mb-2" />
        <Skeleton className="h-6 w-20 mx-auto" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
