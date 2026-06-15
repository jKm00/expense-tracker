import { FullTransaction } from "./transactions.models";

function group(transactions: FullTransaction[]) {
  // Sort transactions by date descending (spread to avoid mutating the cached array)
  const sorted = [...transactions].sort((txA, txB) => {
    return txB.date.getTime() - txA.date.getTime();
  });

  const map = new Map<string, FullTransaction[]>();

  for (const tx of sorted) {
    // Build a YYYY-MM-DD key in local time (toISOString() is UTC and causes
    // off-by-one grouping for timezones ahead of UTC, e.g. Norway UTC+2)
    const y = tx.date.getFullYear();
    const m = String(tx.date.getMonth() + 1).padStart(2, "0");
    const d = String(tx.date.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    const bucket = map.get(key) ?? [];
    bucket.push(tx);
    map.set(key, bucket);
  }

  // Sort the groups by date descending
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, group]) => group);
}

export const transactionUtils = {
  group,
};
