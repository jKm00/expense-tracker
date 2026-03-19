import { TransactionType } from "./transaction.models";

export type NewTransaction = {
  itemName: string;
  description?: string;
  price: number;
  type: TransactionType;
};
