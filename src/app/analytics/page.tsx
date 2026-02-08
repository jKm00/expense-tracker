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
  useFixedExpensesByCategoryDetailed,
  useTotalFixedExpenses,
  useFixedIncomeByCategoryDetailed,
  useTotalFixedIncome,
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
    useFixedExpensesByCategoryDetailed();
  const { data: totalFixed, isLoading: totalFixedLoading } =
    useTotalFixedExpenses();
  const { data: fixedIncomeByCategory, isLoading: fixedIncomeLoading } =
    useFixedIncomeByCategoryDetailed();
  const { data: totalFixedIncome, isLoading: totalFixedIncomeLoading } =
    useTotalFixedIncome();

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const isLoading = statsLoading || fixedLoading || totalFixedLoading || fixedIncomeLoading || totalFixedIncomeLoading;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-48 relative">
      <header className="sticky top-0 z-40 border-b border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <h1 className="text-lg font-semibold text-slate-100">Analytics</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Month Selector */}
        <div
          className="fixed bottom-24 left-0 right-0 mx-auto z-50 px-4"
          style={{ width: "min(100%, 32rem)" }}
        >
          <div className="mx-auto bg-[#12121a]/95 backdrop-blur-lg p-4 rounded-2xl border border-[#1e1e2e] mb-6 shadow-2xl shadow-black/50">
            <MonthSelector
              year={year}
              month={month}
              onMonthChange={handleMonthChange}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6">
          {isLoading ? (
            <StatsCardsSkeleton />
          ) : (
            <StatsCards
              variableIncome={stats?.totalIncome || 0}
              fixedIncome={totalFixedIncome || 0}
              variableExpenses={stats?.totalExpenses || 0}
              fixedExpenses={totalFixed || 0}
            />
          )}
        </div>

        {/* Variable Expenses (moved above Fixed) */}
        <Card className="mb-4 border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-200">
                Variable Expenses
              </CardTitle>
              {!statsLoading && (
                <span className="text-sm font-semibold text-red-400">
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
                drilldown
                compactDrilldown
              />
            )}
          </CardContent>
        </Card>

        {/* Fixed Monthly Costs */}
        <Card className="mb-4 border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-200">
                Fixed Monthly Costs
              </CardTitle>
              {!fixedLoading && (
                <span className="text-sm font-semibold text-indigo-400">
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
                drilldown
              />
            )}
          </CardContent>
        </Card>

        {/* Fixed Monthly Income */}
        <Card className="mb-4 border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-200">
                Fixed Monthly Income
              </CardTitle>
              {!fixedIncomeLoading && (
                <span className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(totalFixedIncome || 0)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {fixedIncomeLoading ? (
              <ChartSkeleton />
            ) : (
              <HorizontalBarChart
                data={fixedIncomeByCategory || []}
                color="#10b981"
                emptyMessage="No fixed income set up"
                drilldown
              />
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="mb-4 border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-slate-200">Daily Activity</CardTitle>
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
        <Card className="border-[#1e1e2e] bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-slate-200">
              All Transactions
              {!transactionsLoading && (
                <span className="ml-2 text-sm font-normal text-slate-500">
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
