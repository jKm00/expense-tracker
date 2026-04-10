import { FullTransaction } from "./transactions.models";

function group(transactions: FullTransaction[]) {
  // Sort transactions by createdAt descending
  transactions.sort((txA, txB) => {
    return txB.createdAt.getTime() - txA.createdAt.getTime();
  });

  const map = new Map<string, FullTransaction[]>();

  for (const tx of transactions) {
    // ISO date string (YYYY-MM-DD) is a stable, locale-neutral key
    const key = tx.createdAt.toISOString().slice(0, 10);
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
