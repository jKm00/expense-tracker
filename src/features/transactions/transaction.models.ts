import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { transaction, transactionType, transactionSource } from "./transaction.schema";

export type Transaction = InferSelectModel<typeof transaction>;
export type NewTransaction = InferInsertModel<typeof transaction>;

export type TransactionType = (typeof transactionType.enumValues)[number];
export type TransactionSource = (typeof transactionSource.enumValues)[number];
