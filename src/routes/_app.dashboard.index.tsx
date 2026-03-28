import { transactionQueries } from "@/features/transactions/transaction.queries";
import { AddTransactionForm } from "@/features/transactions/components/add-transaction.form";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonPage } from "@/components/custom/skeleton-page";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/custom/empty-state";
import { ReceiptTextIcon } from "lucide-react";
import { TransactionListItem } from "@/features/transactions/components/transaction-list-item";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions,
    );
  },
  component: RouteComponent,
});

function DashboardSkeleton() {
  return (
    <SkeletonPage>
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </SkeletonPage>
  );
}

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

function DashboardContent() {
  const { data } = useSuspenseQuery(transactionQueries.getTransactionsOptions);
  const [err, transactions] = data;

  if (err) {
    return (
      <p className="text-muted-foreground">Failed to load dashboard data.</p>
    );
  }

  // Calculate balance summary
  const totalIncome = transactions
    .filter((t) => t.transaction.type === "income")
    .reduce((sum, t) => sum + Number(t.transaction.price), 0);

  const totalExpenses = transactions
    .filter((t) => t.transaction.type === "expense")
    .reduce((sum, t) => sum + Number(t.transaction.price), 0);

  const netBalance = totalIncome - totalExpenses;

  // Recent transactions (last 10)
  const recentTransactions = transactions.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Add transaction form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTransactionForm
            onSuccess={() => toast.success("Transaction saved")}
          />
        </CardContent>
      </Card>

      {/* Balance summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <h3 className="text-muted-foreground">Income</h3>
            <p className="text-2xl font-bold text-green-400">
              {totalIncome.toFixed(2)} ,-
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="text-muted-foreground">Expenses</h3>
            <p className="text-2xl font-bold text-red-400">
              {totalExpenses.toFixed(2)} ,-
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="text-muted-foreground">Net Balance</h3>
            <p
              className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {netBalance.toFixed(2)} ,-
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <Link
            to="/dashboard/transactions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <EmptyState
            message="No transacions yet. Add your first transaction using the form above"
            icon={ReceiptTextIcon}
          />
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((row) => (
              <TransactionListItem key={row.transaction.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
