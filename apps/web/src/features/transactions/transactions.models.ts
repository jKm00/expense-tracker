import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { entries, transactions } from "./transactions.schema";
import { Product, ProductWithTag } from "../products/products.models";
import type { EntryType as _EntryType } from "./transactions.schema";

export const transactionSources = ["manual", "recurring", "scan"] as const;
export type TransactionSource = (typeof transactionSources)[number];

export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;

export const entryTypes = ["income", "expense"] as const;
export type EntryType = _EntryType;

export type Entry = InferSelectModel<typeof entries>;
export type EntryWithProduct = Entry & { product: Product | null };
export type NewEntry = InferInsertModel<typeof entries>;

export type FullTransaction = Transaction & {
  entries: (Entry & {
    products: ProductWithTag | null;
  })[];
};
