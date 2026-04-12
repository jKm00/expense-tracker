import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { createFileRoute } from "@tanstack/react-router";
import { MonthSelect } from "@/components/custom/month-select";
import { Suspense, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { CompareSelect } from "@/features/analytics/components/compare.select";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { TagSelect } from "@/features/tags/components/tag.select";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tagsQueries } from "@/features/tags/tags.queries";
import { Tag } from "@/features/tags/tags.models";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  Anchor,
  Sparkles,
  Receipt,
  Layers,
  DollarSign,
  ShoppingBag,
  Calendar,
  Activity,
} from "lucide-react";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { FullTransaction } from "@/features/transactions/transactions.models";

const anaylyticsSchema = z.object({
  comparison: z.enum(["year", "month"]).optional(),
});

export const Route = createFileRoute("/_app/dashboard/analytics")({
  loaderDeps: ({ search: { month, year } }) => ({ month, year }),
  loader: async ({ context, deps }) => {
    context.queryClient.ensureQueryData(tagsQueries.getTagsOptions());

    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions(deps.year, deps.month),
    );
  },
  component: RouteComponent,
  validateSearch: zodValidator(anaylyticsSchema),
});

function RouteComponent() {
  const {
    data: [_, tags],
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  const [includeTags, setIncludeTags] = useState<Tag[]>([]);
  const [excludeTags, setExcludeTags] = useState<Tag[]>([]);

  const allTags = (tags || []).map((tag) => {
    const { products, ...rest } = tag;
    return rest;
  });

  const availableIncludeTags = allTags.filter(
    (tag) => !excludeTags.some((excludeTag) => excludeTag.id === tag.id),
  );

  const availableExcludeTags = allTags.filter(
    (tag) => !includeTags.some((includeTag) => includeTag.id === tag.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Analytics</PageHeaderTitle>
        <PageHeaderDescription>
          Insights into your spending habits
        </PageHeaderDescription>
      </PageHeader>
      {/* Filter */}
      <section className="flex gap-2">
        <div>
          <Label>Date</Label>
          <MonthSelect
            from="/_app/dashboard/analytics"
            to="/dashboard/analytics"
          />
        </div>
        <div>
          <Label>Comparison</Label>
          <CompareSelect />
        </div>
        <div>
          <Label>Including tags</Label>
          <TagSelect
            tags={availableIncludeTags}
            value={includeTags}
            onChange={setIncludeTags}
          />
        </div>
        <div>
          <Label>Excluding tags</Label>
          <TagSelect
            tags={availableExcludeTags}
            value={excludeTags}
            onChange={setExcludeTags}
          />
        </div>
      </section>
      <Suspense fallback="Loading...">
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}

function AnalyticsContent() {
  const { month, year } = Route.useSearch();
  const {
    data: [expectedTransactionError, transactions],
    error: unexpectedTransactionError,
  } = useSuspenseQuery(transactionQueries.getTransactionsOptions(year, month));

  if (unexpectedTransactionError) {
    return <UnexpectedError />;
  }

  if (expectedTransactionError) {
    let title: string;
    let message: string;

    const reason = expectedTransactionError.reason;
    switch (reason) {
      case "TRANSACTION_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your products from the databse. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happend: ${reason satisfies never}. Please try again!`;
        break;
    }
    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <div className="space-y-6 @container">
      {/* KPIs */}
      <AnalyticsKpis transactions={transactions} />
    </div>
  );
}

function AnalyticsKpis({ transactions }: { transactions: FullTransaction[] }) {
  const formatter = new Intl.NumberFormat("no-NB", {
    style: "currency",
    currency: "NOK",
  });

  const { netBalance, totalIncome, totalExpenses, largest } = useMemo(() => {
    let netBalance = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let largest = 0;
    transactions.forEach((transaction) => {
      const isExpense = transaction.totalPrice.charAt(0) === "-";

      if (isExpense) {
        const number = Number(transaction.totalPrice.slice(1));
        netBalance -= number;
        totalExpenses += number;
        if (number > largest) {
          largest = number;
        }
      } else {
        const number = Number(transaction.totalPrice);
        netBalance += number;
        totalIncome += number;
      }
    });

    return {
      netBalance,
      totalIncome,
      totalExpenses,
      largest,
    };
  }, [transactions]);

  return (
    <section className="space-y-4">
      <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground col-span-full">
          Core Financial
        </h3>
        <div className="@lg:col-span-3 @xl:col-span-1">
          <KpiCard
            title="Net Balance"
            subtitle="Income minus expenses"
            value={formatter.format(netBalance)}
            icon={Scale}
          />
        </div>
        <KpiCard
          title="Total Income"
          subtitle="All money earned"
          value={formatter.format(totalIncome)}
          icon={TrendingUp}
        />
        <KpiCard
          title="Total Expenses"
          subtitle="All money spent"
          value={formatter.format(totalExpenses)}
          icon={TrendingDown}
        />
        <KpiCard
          title="Savings Rate"
          subtitle="Of income saved"
          value="16%"
          icon={Percent}
        />
      </div>
      <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground col-span-full">
          Fixed vs Variable
        </h3>
        <div className="@lg:col-span-3 @xl:col-span-1">
          <KpiCard
            title="Fixed Income"
            subtitle="Recurring earnings"
            value="30 000,-"
            icon={Anchor}
          />
        </div>
        <KpiCard
          title="Variable Income"
          subtitle="Irregular earnings"
          value="2 000,-"
          icon={Sparkles}
        />
        <KpiCard
          title="Fixed Expenses"
          subtitle="Recurring costs"
          value="5 200 ,-"
          icon={Anchor}
        />
        <KpiCard
          title="Variable Expenses"
          subtitle="Irregular costs"
          value="21 600,-"
          icon={Sparkles}
        />
      </div>
      <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground col-span-full">
          Transactions
        </h3>
        <div className="@lg:col-span-3 @xl:col-span-1">
          <KpiCard
            title="Avg Transaction"
            subtitle="Mean transaction size"
            value={formatter.format(
              transactions.length === 0
                ? 0
                : totalExpenses / transactions.length,
            )}
            icon={DollarSign}
          />
        </div>
        <KpiCard
          title="Total Count"
          subtitle="Number of transactions"
          value={`${transactions.length}`}
          icon={Receipt}
        />
        <KpiCard
          title="Items per Tx"
          subtitle="Avg entries per transaction"
          value="2.6"
          icon={Layers}
        />
        <KpiCard
          title="Largest Tx"
          subtitle="Biggest transaction"
          value={formatter.format(largest)}
          icon={TrendingUp}
        />
      </div>
      <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground col-span-full">
          Transaction Items
        </h3>
        <div className="@lg:col-span-3 @xl:col-span-1">
          <KpiCard
            title="Avg Item Value"
            subtitle="Mean item price"
            value="215,-"
            icon={ShoppingBag}
          />
        </div>
        <KpiCard
          title="Total Items"
          subtitle="All line items"
          value="124"
          icon={Layers}
        />
        <KpiCard
          title="Daily Spending"
          subtitle="Average per day"
          value="865,-"
          icon={Calendar}
        />
        <KpiCard
          title="Active Days"
          subtitle="Days with transactions"
          value="23"
          icon={Activity}
        />
      </div>
    </section>
  );
}
