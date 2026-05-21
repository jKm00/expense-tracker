import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { entries, transactions } from "./transactions.schema";
import { Product, ProductWithTag } from "../products/products.models";
import type { EntryType as _EntryType } from "./transactions.schema";
import { Tag } from "../tags/tags.models";

export const transactionSources = [
  "manual",
  "recurring",
  "scan",
  "automation",
] as const;
export type TransactionSource = (typeof transactionSources)[number];

export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;

export const entryTypes = ["income", "expense"] as const;
export type EntryType = _EntryType;

export type Entry = InferSelectModel<typeof entries>;
export type EntryWithProduct = Entry & { product: Product | null; tags: Tag[] };
export type NewEntry = InferInsertModel<typeof entries>;

export type FullTransaction = Transaction & {
  entries: (Entry & {
    products: ProductWithTag | null;
    tags: Tag[];
  })[];
};
