"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, addMonths, subMonths } from "date-fns";
import { Button } from "./ui/button";

interface MonthSelectorProps {
  year: number;
  month: number;
}

export function MonthSelector({ year, month }: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDate = new Date(year, month);

  const navigateToMonth = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", date.getFullYear().toString());
    params.set("month", date.getMonth().toString());
    router.push(`/analytics?${params.toString()}`);
  };

  const goToPrevMonth = () => {
    navigateToMonth(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    navigateToMonth(addMonths(currentDate, 1));
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    navigateToMonth(now);
  };

  const isCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth();

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
        <span className="text-lg font-semibold text-gray-900">
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
