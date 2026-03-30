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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const date =
    month !== undefined && year !== undefined
      ? dayjs().year(year).month(month).startOf("month")
      : dayjs().startOf("month");
  const navigate = useNavigate();

  function handlePrevMonth() {
    const newDate = dayjs(date).subtract(1, "month");
    handleNavigate(newDate.month(), newDate.year());
  }

  function handleNextMonth() {
    const newDate = dayjs(date).add(1, "month");
    handleNavigate(newDate.month(), newDate.year());
  }

  function handleMonthChange(month: number) {
    handleNavigate(month, date.year());
  }

  function resetDate() {
    const today = dayjs().startOf("month");
    handleNavigate(today.month(), today.year());
  }

  function handleNavigate(month: number, year: number) {
    navigate({
      to: "/dashboard/transactions",
      search: {
        month,
        year,
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions">
        <div className="flex items-center gap-1">
          {(date.month() !== dayjs().month() ||
            date.year() !== dayjs().year()) && (
            <Button variant="outline" onClick={resetDate}>
              Today
            </Button>
          )}
          <Button variant="outline" onClick={handlePrevMonth}>
            <ChevronLeft />
          </Button>
          <Select
            value={`${date.month()}`}
            onValueChange={(v) => handleMonthChange(Number(v))}
          >
            <SelectTrigger className="w-full min-w-40 max-w-48">
              <Calendar />
              <SelectValue placeholder="Select a month" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Months</SelectLabel>
                <SelectItem value="0">January</SelectItem>
                <SelectItem value="1">Febrary</SelectItem>
                <SelectItem value="2">March</SelectItem>
                <SelectItem value="3">April</SelectItem>
                <SelectItem value="4">May</SelectItem>
                <SelectItem value="5">June</SelectItem>
                <SelectItem value="6">July</SelectItem>
                <SelectItem value="7">August</SelectItem>
                <SelectItem value="8">September</SelectItem>
                <SelectItem value="9">October</SelectItem>
                <SelectItem value="10">November</SelectItem>
                <SelectItem value="11">December</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {/*}<div className="flex gap-2 items-center border rounded-lg h-8 px-2.5 py-1 min-w-40">
            <Calendar className="size-4" />
            <p className="text-sm">
              {date.toDate().toLocaleString("en-UK", {
                month: "long",
              })}
            </p>
          </div> */}
          <Button variant="outline" onClick={handleNextMonth}>
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
