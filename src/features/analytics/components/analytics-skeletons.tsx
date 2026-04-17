import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiCardSkeleton() {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5 py-1">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-16 mt-0.5" />
      </CardContent>
    </Card>
  );
}

export function ChartCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export function AnalyticsContentSkeleton() {
  return (
    <div className="space-y-6 @container">
      {/* 1. Hero KPIs */}
      <section className="grid gap-3 @md:grid-cols-3">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </section>

      {/* 2. Cumulative spending chart */}
      <ChartCardSkeleton />

      {/* 3. Daily Activity chart + Quick Stats sidebar */}
      <div className="grid gap-6 @xl:grid-cols-[1fr_280px] items-start">
        <ChartCardSkeleton />
        <div className="grid grid-cols-2 gap-3 @xl:grid-cols-1">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      </div>

      {/* 4. Collapsed detailed metrics button */}
      <Skeleton className="h-11 w-full rounded-lg" />

      {/* 5. Breakdown charts */}
      <div className="grid gap-6 @lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}
