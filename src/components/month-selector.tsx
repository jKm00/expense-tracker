"use client";

import { format, addMonths, subMonths } from "date-fns";
import { Button } from "./ui/button";

interface MonthSelectorProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onMonthChange }: MonthSelectorProps) {
  const currentDate = new Date(year, month);
  const now = new Date();

  const goToPrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    onMonthChange(prev.getFullYear(), prev.getMonth());
  };

  const goToNextMonth = () => {
    const next = addMonths(currentDate, 1);
    onMonthChange(next.getFullYear(), next.getMonth());
  };

  const goToCurrentMonth = () => {
    onMonthChange(now.getFullYear(), now.getMonth());
  };

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrevMonth}
        className="h-10 w-10 p-0"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-slate-100">
          {format(currentDate, "MMMM yyyy")}
        </span>
        {!isCurrentMonth && (
          <Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
            Today
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={goToNextMonth}
        className="h-10 w-10 p-0"
        disabled={isCurrentMonth}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Button>
    </div>
  );
}
