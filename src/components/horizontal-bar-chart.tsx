"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface ChartItem {
  name: string;
  value: number;
}

interface ChartCategory {
  name: string;
  value: number;
  items?: ChartItem[];
}

interface HorizontalBarChartProps {
  data: ChartCategory[];
  color?: string;
  maxItems?: number;
  emptyMessage?: string;
  drilldown?: boolean;
  compactDrilldown?: boolean; // Show only labels without sub-bars
}

// Harmonious color palette
const COLOR_PALETTE = [
  "#3b82f6", // blue-500
  "#06b6d4", // cyan-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#84cc16", // lime-500
];

function getColor(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

export function HorizontalBarChart({
  data,
  color = "#ef4444",
  maxItems = 5,
  emptyMessage = "No data",
  drilldown = false,
  compactDrilldown = false,
}: HorizontalBarChartProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">{emptyMessage}</div>
    );
  }

  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  // Show all if expanded, otherwise limit
  const displayData = expanded ? sortedData : sortedData.slice(0, maxItems);
  const hasMore = data.length > maxItems;
  const remaining = data.length - maxItems;

  const maxValue = Math.max(...sortedData.map((d) => d.value));

  const handleCategoryClick = (categoryName: string, canExpand: boolean) => {
    if (!canExpand) return;
    setExpandedCategory(
      expandedCategory === categoryName ? null : categoryName
    );
  };

  return (
    <div className="space-y-3">
      {displayData.map((item, index) => {
        const isExpanded = expandedCategory === item.name;
        const hasItems = item.items && item.items.length > 0;
        const canExpand = drilldown && hasItems && item.items!.length > 1;
        const showSegments = canExpand && isExpanded;

        return (
          <div key={item.name} className="space-y-2">
            {/* Category Row - Clickable area */}
            <div 
              className={`space-y-1 ${canExpand ? 'cursor-pointer' : ''}`}
              onClick={() => handleCategoryClick(item.name, !!canExpand)}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  {canExpand && (
                    <span className="text-gray-400">
                      {isExpanded ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </span>
                  )}
                  <span className="font-medium text-slate-300 truncate">
                    {item.name}
                  </span>
                </div>
                <span className="text-slate-100 font-semibold whitespace-nowrap">
                  {formatCurrency(item.value)}
                </span>
              </div>
              
              {/* Bar - Either solid or stacked */}
              <div className="h-3 w-full rounded-full bg-[#1e1e2e] overflow-hidden">
                {showSegments ? (
                  // Stacked bar with individual colors
                  <div className="flex h-full">
                    {item.items!.map((subItem, subIndex) => {
                      const width = (subItem.value / item.value) * 100;
                      return (
                        <div
                          key={`${subItem.name}-${subIndex}`}
                          className="h-full transition-all duration-500 ease-out"
                          style={{
                            width: `${width}%`,
                            backgroundColor: getColor(subIndex),
                          }}
                          title={`${subItem.name}: ${formatCurrency(subItem.value)}`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  // Regular bar
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: color,
                      opacity: Math.max(0.5, 1 - index * 0.08),
                    }}
                  />
                )}
              </div>
            </div>

            {/* Expanded Items */}
            {canExpand && isExpanded && (
              compactDrilldown ? (
                // Compact view - just labels with colored dots
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 ml-5 animate-in fade-in duration-200">
                  {item.items!.map((subItem, subIndex) => (
                    <div
                      key={`${subItem.name}-${subIndex}`}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <div
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getColor(subIndex) }}
                      />
                      <span className="text-slate-400">{subItem.name}</span>
                      <span className="text-slate-500">{formatCurrency(subItem.value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                // Full view - with sub-bars
                <div className="ml-5 space-y-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                  {item.items!.map((subItem, subIndex) => (
                    <div key={`${subItem.name}-${subIndex}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: getColor(subIndex) }}
                          />
                          <span className="text-slate-400">{subItem.name}</span>
                        </div>
                        <span className="text-slate-200 font-medium">
                          {formatCurrency(subItem.value)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#1e1e2e] overflow-hidden ml-4.5">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${(subItem.value / item.value) * 100}%`,
                            backgroundColor: getColor(subIndex),
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })}
      
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full pt-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? "Show less" : `+${remaining} more`}
        </button>
      )}
    </div>
  );
}
