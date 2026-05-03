import dayjs from "dayjs";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { Tag } from "@/features/tags/tags.models";
import { ComparisonDelta } from "./analytics.models";

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

export function calculateComparisonDelta(
  current: number,
  comparison: number,
  favorableDirection: "up" | "down",
): ComparisonDelta {
  const absolute = current - comparison;
  const percentage =
    comparison === 0 ? 0 : ((current - comparison) / Math.abs(comparison)) * 100;

  let direction: "up" | "down" | "neutral";
  if (absolute > 0) direction = "up";
  else if (absolute < 0) direction = "down";
  else direction = "neutral";

  const favorable =
    direction === "neutral"
      ? true
      : direction === favorableDirection;

  return {
    absolute,
    percentage,
    direction,
    favorable,
  };
}

export function filterTransactionsByTags(
  transactions: FullTransaction[],
  includeTags: Tag[],
  excludeTags: Tag[],
): FullTransaction[] {
  if (includeTags.length === 0 && excludeTags.length === 0) {
    return transactions;
  }

  const includeTagIds = new Set(includeTags.map((tag) => tag.id));
  const excludeTagIds = new Set(excludeTags.map((tag) => tag.id));

  return transactions
    .map((transaction) => {
      const filteredEntries = transaction.entries.filter((entry) => {
        const entryTagIds = getMergedEntryTags(entry).map((tag) => tag.id);

        if (
          excludeTagIds.size > 0 &&
          entryTagIds.some((tagId) => excludeTagIds.has(tagId))
        ) {
          return false;
        }

        if (
          includeTagIds.size > 0 &&
          !entryTagIds.some((tagId) => includeTagIds.has(tagId))
        ) {
          return false;
        }

        return true;
      });

      // Return transaction with filtered entries
      return {
        ...transaction,
        entries: filteredEntries,
      };
    })
    .filter((transaction) => transaction.entries.length > 0);
}

export function getMergedEntryTags(entry: FullTransaction["entries"][number]) {
  const merged = new Map<string, Tag>();

  const productTags = entry.products?.tags ?? [];
  const directEntryTags = entry.tags ?? [];

  for (const tag of productTags) {
    merged.set(tag.id, tag);
  }

  for (const tag of directEntryTags) {
    merged.set(tag.id, tag);
  }

  return Array.from(merged.values());
}
