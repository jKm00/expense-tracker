"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface ChartItem {
  name: string;
  value: number;
  date?: string;
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
}

// Color palettes for drill-down sub-items, keyed by parent bar color
const PALETTES: Record<string, string[]> = {
  // Red (Variable Expenses) - Modern sunset/warm vibe (Red -> Rose -> Pink -> Violet -> Orange)
  "#ef4444": [
    "#f43f5e", // rose-500
    "#ec4899", // pink-500
    "#8b5cf6", // violet-500
    "#f97316", // orange-500
    "#d946ef", // fuchsia-500
    "#e11d48", // rose-600
    "#db2777", // pink-600
    "#7c3aed", // violet-600
    "#ea580c", // orange-600
    "#c026d3", // fuchsia-600
  ],
  // Indigo (Fixed Monthly Costs) - blues, cyans, violets
  "#6366f1": [
    "#3b82f6", // blue-500
    "#06b6d4", // cyan-500
    "#8b5cf6", // violet-500
    "#818cf8", // indigo-400
    "#38bdf8", // sky-400
    "#a78bfa", // violet-400
    "#67e8f9", // cyan-300
    "#c084fc", // purple-400
    "#7dd3fc", // sky-300
    "#93c5fd", // blue-300
  ],
  // Green (Fixed Monthly Income) - greens, teals, emeralds
  "#10b981": [
    "#34d399", // emerald-400
    "#2dd4bf", // teal-400
    "#4ade80", // green-400
    "#a3e635", // lime-400
    "#5eead4", // teal-300
    "#6ee7b7", // emerald-300
    "#86efac", // green-300
    "#14b8a6", // teal-500
    "#22d3ee", // cyan-400
    "#059669", // emerald-600
  ],
};

// Fallback palette
const DEFAULT_PALETTE = PALETTES["#6366f1"];

function getColor(index: number, parentColor: string): string {
  const palette = PALETTES[parentColor] || DEFAULT_PALETTE;
  return palette[index % palette.length];
}

export function HorizontalBarChart({
  data,
  color = "#ef4444",
  maxItems = 5,
  emptyMessage = "No data",
  drilldown = false,
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
                  // Stacked bar with individual colors, sorted by value descending
                  <div className="flex h-full">
                    {[...item.items!]
                      .sort((a, b) => b.value - a.value)
                      .map((subItem, subIndex) => {
                        const width = (subItem.value / item.value) * 100;
                        const segmentColor = getColor(subIndex, color);
                        return (
                          <div
                            key={`${subItem.name}-${subIndex}`}
                            className="h-full transition-all duration-500 ease-out"
                            style={{
                              width: `${width}%`,
                              backgroundColor: segmentColor,
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
              // Full view - with sub-bars, sorted by value descending
              <div className="ml-5 space-y-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                {[...item.items!]
                  .sort((a, b) => b.value - a.value)
                  .map((subItem, subIndex) => {
                  const subMaxValue = Math.max(...item.items!.map((i) => i.value));
                  return (
                    <div key={`${subItem.name}-${subIndex}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getColor(subIndex, color) }}
                          />
                          <span className="text-slate-400 truncate">{subItem.name}</span>
                        </div>
                        <span className="text-slate-200 font-medium whitespace-nowrap ml-2">
                          {formatCurrency(subItem.value)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden ml-[18px]">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${(subItem.value / subMaxValue) * 100}%`,
                            backgroundColor: getColor(subIndex, color),
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
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
