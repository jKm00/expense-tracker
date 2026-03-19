import { TransactionSource, TransactionType } from "./transaction.models";

export type CreateTransactionInput = {
  itemName: string;
  description?: string;
  price: number;
  type: TransactionType;
  source: TransactionSource;
};
