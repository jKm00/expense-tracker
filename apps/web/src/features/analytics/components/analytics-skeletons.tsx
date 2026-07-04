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

export function MonthScoreHeroSkeleton() {
  return (
    <Card className="relative overflow-hidden py-0 shadow-sm">
      <CardContent className="relative p-3 sm:p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,--alpha(var(--muted)_/_70%),transparent_36%),radial-gradient(circle_at_88%_4%,--alpha(var(--primary)_/_7%),transparent_30%)]" />
        <div className="relative grid gap-3 lg:grid-cols-[minmax(210px,0.78fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="mb-0.5 h-3 w-6" />
                <Skeleton className="mb-0.5 h-4 w-32" />
              </div>
            </div>
          </div>

          <div className="grid gap-2 border-t pt-3 sm:grid-cols-2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
            <DriverNoteSkeleton />
            <DriverNoteSkeleton />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DriverNoteSkeleton() {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-16" />
        <span className="h-px min-w-3 flex-1 bg-border/80" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );
}

export function AnalyticsContentSkeleton({
  showMonthScore = false,
}: {
  showMonthScore?: boolean;
}) {
  return (
    <div className="space-y-6 @container">
      {showMonthScore && <MonthScoreHeroSkeleton />}

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

      {/* 6. Recurring expenses chart */}
      <ChartCardSkeleton />
    </div>
  );
}
