import { TransactionSource, TransactionType } from "./transaction.models";

export type CreateTransactionInput = {
  productName: string;
  description?: string;
  price: number;
  type: TransactionType;
  source: TransactionSource;
};
