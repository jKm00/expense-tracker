import { transactionQueries } from "@/features/transactions/transaction.queries";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeleton-list";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";

const dashboardSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
});

export const Route = createFileRoute("/_app/dashboard/transactions/")({
  loaderDeps: ({ search: { month, year } }) => ({ month, year }),
  loader: async ({ context, deps }) => {
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(deps.month, deps.year),
    );
  },
  validateSearch: zodValidator(dashboardSearchSchema),
  component: RouteComponent,
});

function RouteComponent() {
  const { month, year } = Route.useSearch();
  const date = month && year ? new Date(year, month, 1) : new Date();
  const navigate = useNavigate();

  function prevMonth() {
    const newDate = dayjs(date).subtract(1, "month");
    console.log(newDate);
    navigate({
      to: "/dashboard/transactions",
      search: {
        month: newDate.get("month"),
        year: newDate.get("year"),
      },
    });
  }

  function nextMonth() {
    const newDate = dayjs(date).add(1, "month");
    navigate({
      to: "/dashboard/transactions",
      search: {
        month: newDate.get("month"),
        year: newDate.get("year"),
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions">
        <div className="flex items-center gap-1">
          <Button variant="outline" onClick={prevMonth}>
            <ChevronLeft />
          </Button>
          {/*<div className="flex items-center gap-2 py-2 px-4 border rounded-md">*/}
          <div className="flex gap-2 items-center border rounded-lg h-8 px-2.5 py-1 min-w-40">
            <Calendar className="size-4" />
            <p className="text-sm">
              {date.toLocaleString("en-UK", {
                month: "long",
              })}
            </p>
          </div>
          <Button variant="outline" onClick={nextMonth}>
            <ChevronRight />
          </Button>
        </div>
      </PageHeader>
      <Suspense fallback={<SkeletonList rows={8} />}>
        <TransactionsContent />
      </Suspense>
    </div>
  );
}

function TransactionsContent() {
  const { month, year } = Route.useSearch();
  const { data } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(month, year),
  );
  const [err, transactions] = data;

  if (err) {
    return (
      <p className="text-muted-foreground">Failed to load transactions.</p>
    );
  }

  return <TransactionList transactions={transactions} />;
}
