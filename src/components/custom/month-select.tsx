import { useNavigate, useSearch } from "@tanstack/react-router";
import dayjs from "dayjs";
import { Button } from "../ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  return (
    <div className="flex items-center gap-1">
      {(date.month() !== dayjs().month() || date.year() !== dayjs().year()) && (
        <Button variant="outline" onClick={resetDate}>
          Today
        </Button>
      )}
      <Button variant="outline" onClick={handlePrevMonth}>
        <ChevronLeft />
      </Button>
      <Select
        value={`${date.month()}`}
        onValueChange={(v) => handleMonthChange(Number(v))}
      >
        <SelectTrigger className="w-full min-w-40 max-w-48">
          <Calendar />
          <SelectValue placeholder="Select a month" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Months</SelectLabel>
            <SelectItem value="0">January</SelectItem>
            <SelectItem value="1">Febrary</SelectItem>
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
      <Button variant="outline" onClick={handleNextMonth}>
        <ChevronRight />
      </Button>
    </div>
  );
}
