import { InferSelectModel } from "drizzle-orm";
import { entries, transactions } from "./transactions.schema";
import { Product } from "../products/products.models";

export type Transaction = InferSelectModel<typeof transactions>;
export type Entry = InferSelectModel<typeof entries>;

export type FullTransaction = Transaction & {
  entries: (Entry & {
    products: Product | null;
  })[];
};
