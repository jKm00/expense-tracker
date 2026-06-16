import {
  EmptyState,
  EmptyStateAction,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Link } from "@tanstack/react-router";
import { ChartArea, Plus } from "lucide-react";
import dayjs from "dayjs";
import { XAxis, YAxis } from "recharts";

export function AnalyticsChartEmptyState({ message }: { message: string }) {
  return (
    <EmptyState icon={ChartArea}>
      <EmptyStateMessage>{message}</EmptyStateMessage>
      <EmptyStateAction>
        <Button asChild size="sm" variant="outline">
          <Link to="/dashboard/transactions/new">
            <Plus className="size-4" />
            Create transaction
          </Link>
        </Button>
      </EmptyStateAction>
    </EmptyState>
  );
}

export function AnalyticsChartAxes({ yTickLine }: { yTickLine: boolean }) {
  return (
    <>
      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis
        tickLine={yTickLine}
        axisLine={false}
        tickMargin={8}
        tickCount={3}
      />
    </>
  );
}

export function AnalyticsChartOverlays() {
  return (
    <>
      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
    </>
  );
}

export function AnalyticsPeriodFooter({
  label,
  year,
  month,
  compareYear,
  compareMonth,
}: {
  label: string;
  year: number;
  month: number;
  compareYear: number;
  compareMonth: number;
}) {
  return (
    <div className="flex w-full items-start gap-2 text-sm">
      <div className="flex items-center gap-2 leading-none text-muted-foreground">
        {label} for {dayjs(new Date(year, month)).format("MMMM YYYY")} vs{" "}
        {dayjs(new Date(compareYear, compareMonth)).format("MMMM YYYY")}
      </div>
    </div>
  );
}
