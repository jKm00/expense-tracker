"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { MonthSelector } from "@/components/month-selector";
import { StatsCards } from "@/components/stats-cards";
import { CategoryPieChart } from "@/components/category-pie-chart";
import { DailyBarChart } from "@/components/daily-bar-chart";
import { TransactionsTable } from "@/components/transactions-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  StatsCardsSkeleton,
  ChartSkeleton,
  TransactionListSkeleton,
} from "@/components/ui/skeleton";
import { useMonthlyStats, useMonthlyTransactions } from "@/hooks/use-data";

export default function AnalyticsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data: stats, isLoading: statsLoading } = useMonthlyStats(year, month);
  const { data: transactions, isLoading: transactionsLoading } =
    useMonthlyTransactions(year, month);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
          {statsLoading ? (
            <StatsCardsSkeleton />
          ) : (
            <StatsCards
              totalIncome={stats?.totalIncome || 0}
              totalExpenses={stats?.totalExpenses || 0}
              netBalance={stats?.netBalance || 0}
            />
          )}
        </div>

        {/* Category Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <ChartSkeleton />
            ) : (
              <CategoryPieChart data={stats?.categoryBreakdown || []} />
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="mb-6">
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
