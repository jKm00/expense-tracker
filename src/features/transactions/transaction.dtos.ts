import { TransactionType } from "./transaction.models";

export type NewTransaction = {
  product: string;
  price: number;
  type: TransactionType;
};
