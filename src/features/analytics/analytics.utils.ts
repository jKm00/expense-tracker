import dayjs from "dayjs";

export function getComparisonDate(
  year: number | undefined,
  month: number | undefined,
  comparison: "year" | "month" | undefined,
): { compareYear: number; compareMonth: number } {
  // Determine the selected date (default to current date if not provided)
  const selectedDate =
    year !== undefined && month !== undefined
      ? dayjs(new Date(year, month, 1))
      : dayjs();

  // Calculate comparison date based on comparison type (default to previous month)
  const compareDate =
    comparison === "year"
      ? selectedDate.subtract(1, "year")
      : selectedDate.subtract(1, "month");

  return {
    compareYear: compareDate.year(),
    compareMonth: compareDate.month(),
  };
}
