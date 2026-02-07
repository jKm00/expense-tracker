"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { MonthSelector } from "@/components/month-selector";
import { StatsCards } from "@/components/stats-cards";
import { HorizontalBarChart } from "@/components/horizontal-bar-chart";
import { DailyBarChart } from "@/components/daily-bar-chart";
import { TransactionsTable } from "@/components/transactions-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  StatsCardsSkeleton,
  ChartSkeleton,
  TransactionListSkeleton,
} from "@/components/ui/skeleton";
import {
  useMonthlyStats,
  useMonthlyTransactions,
  useFixedExpensesByCategory,
  useTotalFixedExpenses,
} from "@/hooks/use-data";
import { formatCurrency } from "@/lib/utils";

export default function AnalyticsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data: stats, isLoading: statsLoading } = useMonthlyStats(year, month);
  const { data: transactions, isLoading: transactionsLoading } =
    useMonthlyTransactions(year, month);
  const { data: fixedByCategory, isLoading: fixedLoading } =
    useFixedExpensesByCategory();
  const { data: totalFixed, isLoading: totalFixedLoading } =
    useTotalFixedExpenses();

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const isLoading = statsLoading || fixedLoading || totalFixedLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <h1 className="text-lg font-semibold">Analytics</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Month Selector */}
        <div className="mb-6">
          <MonthSelector
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Stats Cards */}
        <div className="mb-6">
          {isLoading ? (
            <StatsCardsSkeleton />
          ) : (
            <StatsCards
              totalIncome={stats?.totalIncome || 0}
              variableExpenses={stats?.totalExpenses || 0}
              fixedExpenses={totalFixed || 0}
            />
          )}
        </div>

        {/* Variable Expenses (moved above Fixed) */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Variable Expenses</CardTitle>
              {!statsLoading && (
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(stats?.totalExpenses || 0)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <ChartSkeleton />
            ) : (
              <HorizontalBarChart
                data={stats?.categoryBreakdown || []}
                color="#ef4444"
                emptyMessage="No variable expenses this month"
              />
            )}
          </CardContent>
        </Card>

        {/* Fixed Monthly Costs */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fixed Monthly Costs</CardTitle>
              {!fixedLoading && (
                <span className="text-sm font-semibold text-indigo-600">
                  {formatCurrency(totalFixed || 0)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {fixedLoading ? (
              <ChartSkeleton />
            ) : (
              <HorizontalBarChart
                data={fixedByCategory || []}
                color="#6366f1"
                emptyMessage="No fixed expenses set up"
              />
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <ChartSkeleton />
            ) : (
              <DailyBarChart data={stats?.dailyBreakdown || []} />
            )}
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>
              All Transactions
              {!transactionsLoading && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({transactions?.length || 0})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <TransactionListSkeleton count={5} />
            ) : (
              <TransactionsTable transactions={transactions || []} />
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
