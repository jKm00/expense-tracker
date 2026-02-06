import { Suspense } from "react";
import { Header } from "@/components/header";
import { MonthSelector } from "@/components/month-selector";
import { StatsCards } from "@/components/stats-cards";
import { CategoryPieChart } from "@/components/category-pie-chart";
import { DailyBarChart } from "@/components/daily-bar-chart";
import { TransactionsTable } from "@/components/transactions-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getMonthlyStats,
  getTransactionsByMonth,
} from "@/actions/transactions";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth();

  const [stats, transactions] = await Promise.all([
    getMonthlyStats(year, month),
    getTransactionsByMonth(year, month),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Month Selector */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-10" />}>
            <MonthSelector year={year} month={month} />
          </Suspense>
        </div>

        {/* Stats Cards */}
        <div className="mb-6">
          <StatsCards
            totalIncome={stats.totalIncome}
            totalExpenses={stats.totalExpenses}
            netBalance={stats.netBalance}
          />
        </div>

        {/* Category Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={stats.categoryBreakdown} />
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyBarChart data={stats.dailyBreakdown} />
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>
              All Transactions
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({stats.transactionCount})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsTable transactions={transactions} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
