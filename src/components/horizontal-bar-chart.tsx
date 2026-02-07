"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface HorizontalBarChartProps {
  data: { name: string; value: number }[];
  color?: string;
  maxItems?: number;
  emptyMessage?: string;
}

export function HorizontalBarChart({
  data,
  color = "#ef4444",
  maxItems = 5,
  emptyMessage = "No data",
}: HorizontalBarChartProps) {
  const [expanded, setExpanded] = useState(false);

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">{emptyMessage}</div>
    );
  }

  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  // Show all if expanded, otherwise limit
  const displayData = expanded ? sortedData : sortedData.slice(0, maxItems);
  const hasMore = data.length > maxItems;
  const remaining = data.length - maxItems;

  const maxValue = Math.max(...sortedData.map((d) => d.value));

  return (
    <div className="space-y-3">
      {displayData.map((item, index) => (
        <div key={item.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 truncate mr-2">
              {item.name}
            </span>
            <span className="text-gray-900 font-semibold whitespace-nowrap">
              {formatCurrency(item.value)}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: color,
                opacity: Math.max(0.5, 1 - index * 0.08),
              }}
            />
          </div>
        </div>
      ))}
      
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full pt-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? "Show less" : `+${remaining} more`}
        </button>
      )}
    </div>
  );
}
