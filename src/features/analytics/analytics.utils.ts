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
      // Filter entries based on their product tags
      const filteredEntries = transaction.entries.filter((entry) => {
        // If no product, skip this entry
        if (!entry.products) return false;

        // Get all tag IDs for this product
        const productTagIds = entry.products.tags.map((tag) => tag.id);

        // If exclude tags are specified and product has any excluded tag, skip this entry
        if (
          excludeTagIds.size > 0 &&
          productTagIds.some((tagId) => excludeTagIds.has(tagId))
        ) {
          return false;
        }

        // If include tags are specified, product must have at least one included tag
        if (
          includeTagIds.size > 0 &&
          !productTagIds.some((tagId) => includeTagIds.has(tagId))
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
    // Remove transactions that have no entries after filtering
    .filter((transaction) => transaction.entries.length > 0);
}

