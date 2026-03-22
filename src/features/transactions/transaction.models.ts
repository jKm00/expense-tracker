import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { transaction, transactionType, transactionSource } from "./transaction.schema";
import type { Product } from "../products/product.models";

export type Transaction = InferSelectModel<typeof transaction>;
export type NewTransaction = InferInsertModel<typeof transaction>;

export type TransactionType = (typeof transactionType.enumValues)[number];
export type TransactionSource = (typeof transactionSource.enumValues)[number];

// The mutable fields of a transaction — productId, source, userId, createdAt are immutable
export type UpdateTransaction = Partial<
  Pick<Transaction, "price" | "type" | "date" | "description">
>;

// Transaction with product joined (returned from repo.get)
export type TransactionWithProduct = {
  transaction: Transaction;
  product: Product | null;
};
