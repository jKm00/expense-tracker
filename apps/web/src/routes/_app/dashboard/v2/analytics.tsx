import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import z from "zod";
import { MonthSelect } from "@/components/custom/month-select";
import { getDashboardDataOptions } from "@/features/analytics-v2/analytics-v2.queries";
import { AnalyticsV2Dashboard } from "@/features/analytics-v2/components/analytics-v2-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const analyticsV2Schema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
});

export const Route = createFileRoute("/_app/dashboard/v2/analytics")({
  validateSearch: analyticsV2Schema,
  loaderDeps: ({ search: { month, year } }) => ({
    month,
    year,
  }),
  loader: async ({ context, deps }) => {
    // Prefetch analytics v2 data
    context.queryClient.prefetchQuery(
      getDashboardDataOptions(deps.year, deps.month),
    );
  },
  component: AnalyticsV2Page,
});

function AnalyticsV2Page() {
  const { month, year } = Route.useSearch();

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4">
        <PageHeader>
          <PageHeaderTitle>
            <span className="inline-flex items-center gap-2">
              Analytics (v2)
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                ALPHA
              </Badge>
            </span>
          </PageHeaderTitle>
          <PageHeaderDescription>
            Deep dive into your economics, spending trends, and category
            breakdowns.
          </PageHeaderDescription>
        </PageHeader>
        <MonthSelect
          from="/_app/dashboard/v2/analytics"
          to="/dashboard/v2/analytics"
        />
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <AnalyticsV2Dashboard year={year} month={month} />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="h-[400px] w-full col-span-4" />
        <Skeleton className="h-[400px] w-full col-span-3" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}
