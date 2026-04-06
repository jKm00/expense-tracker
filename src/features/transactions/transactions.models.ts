import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { entries, transactions } from "./transactions.schema";
import { Product } from "../products/products.models";

export type Transaction = InferSelectModel<typeof transactions>;
export type Entry = InferSelectModel<typeof entries>;

export const entryTypes = ["income", "expense"] as const;
export type EntryType = (typeof entryTypes)[number];

export type FullTransaction = Transaction & {
  entries: (Entry & {
    products: Product | null;
  })[];
};

type EntryProduct = {
  id: string | null;
  name: string;
};
type InsertEntry = InferInsertModel<typeof entries>;
type NewEntryBase = Omit<InsertEntry, "id" | "transactionId" | "productId">;
export type NewEntry = NewEntryBase & {
  product: EntryProduct;
};
