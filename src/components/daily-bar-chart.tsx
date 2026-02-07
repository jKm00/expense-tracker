"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DailyBarChartProps {
  data: { day: number; expenses: number; income: number }[];
}

export function DailyBarChart({ data }: DailyBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        No transactions this month
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value as number)}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #1e1e2e",
              backgroundColor: "#12121a",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.5)",
            }}
            itemStyle={{ color: "#f8fafc" }}
            labelStyle={{ color: "#64748b" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => (
              <span className="text-slate-400 capitalize">{value}</span>
            )}
          />
          <Bar
            dataKey="income"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expenses"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
