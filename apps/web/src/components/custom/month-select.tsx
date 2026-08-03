import { useNavigate, useSearch } from "@tanstack/react-router";
import dayjs from "dayjs";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function MonthSelect({
  from,
  to,
}: {
  from: "/_app/dashboard/transactions/" | "/_app/dashboard/analytics";
  to: string;
}) {
  const { month, year } = useSearch({
    from,
  });
  const date =
    month !== undefined && year !== undefined
      ? dayjs().year(year).month(month).startOf("month")
      : dayjs().startOf("month");
  const navigate = useNavigate();

  function handlePrevMonth() {
    const newDate = dayjs(date).subtract(1, "month");
    handleNavigate(newDate.month(), newDate.year());
  }

  function handleNextMonth() {
    const newDate = dayjs(date).add(1, "month");
    handleNavigate(newDate.month(), newDate.year());
  }

  function handleMonthChange(month: number) {
    handleNavigate(month, date.year());
  }

  function resetDate() {
    const today = dayjs().startOf("month");
    handleNavigate(today.month(), today.year());
  }

  function handleNavigate(month: number, year: number) {
    navigate({
      to,
      search: (prev) => ({
        ...prev,
        month,
        year,
      }),
    });
  }

  const isCurrentMonth =
    date.month() === dayjs().month() && date.year() === dayjs().year();

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        aria-label="Previous month"
        onClick={handlePrevMonth}
      >
        <ChevronLeft className="size-3.5" />
      </Button>
      <Select
        value={`${date.month()}`}
        onValueChange={(v) => handleMonthChange(Number(v))}
      >
        <SelectTrigger className="h-8 min-w-32 max-w-44 text-xs">
          <SelectValue placeholder="Select a month" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="0">January</SelectItem>
            <SelectItem value="1">February</SelectItem>
            <SelectItem value="2">March</SelectItem>
            <SelectItem value="3">April</SelectItem>
            <SelectItem value="4">May</SelectItem>
            <SelectItem value="5">June</SelectItem>
            <SelectItem value="6">July</SelectItem>
            <SelectItem value="7">August</SelectItem>
            <SelectItem value="8">September</SelectItem>
            <SelectItem value="9">October</SelectItem>
            <SelectItem value="10">November</SelectItem>
            <SelectItem value="11">December</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        aria-label="Next month"
        onClick={handleNextMonth}
      >
        <ChevronRight className="size-3.5" />
      </Button>
      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-8 text-xs text-muted-foreground"
          onClick={resetDate}
        >
          Today
        </Button>
      )}
    </div>
  );
}
