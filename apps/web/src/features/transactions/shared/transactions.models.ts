import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { entries, transactions } from "@/features/transactions/server/transactions.schema";
import type { Product, ProductWithTag } from "@/features/products/shared/products.models";
import type { Tag } from "@/features/tags/shared/tags.models";

export const transactionSources = [
  "manual",
  "recurring",
  "scan",
  "integration",
  "shopping",
] as const;
export type TransactionSource = (typeof transactionSources)[number];

export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;

export const entryTypes = ["income", "expense"] as const;
export type EntryType = (typeof entryTypes)[number];

export type Entry = InferSelectModel<typeof entries>;
export type EntryWithProduct = Entry & { product: Product | null; tags: Tag[] };
export type NewEntry = InferInsertModel<typeof entries>;

export type FullTransaction = Transaction & {
  entries: (Entry & {
    products: ProductWithTag | null;
    tags: Tag[];
  })[];
};

export type TransactionKpis = {
  count: number;
  averagePerDay: number;
  averageItemsPerTransaction: number;
};
