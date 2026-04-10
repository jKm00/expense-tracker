import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { entries, transactions } from "./transactions.schema";
import { Product } from "../products/products.models";

export const transactionSources = ["manual", "recurring", "scan"] as const;
export type TransactionSource = (typeof transactionSources)[number];

export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;

export const entryTypes = ["income", "expense"] as const;
export type EntryType = (typeof entryTypes)[number];

export type Entry = InferSelectModel<typeof entries>;
export type EntryWithProduct = Entry & { products: Product | null };
export type NewEntry = InferInsertModel<typeof entries>;

export type FullTransaction = Transaction & {
  entries: (Entry & {
    products: Product | null;
  })[];
};
