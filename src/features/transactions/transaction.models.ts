export type TransactionType = "expense" | "income";

export type TransactionSource = "reciept" | "recurring" | "manual";

export type Transaction = {
  id: string;
  userId: string;
  itemId: string;
  price: number;
  type: TransactionType;
  source: TransactionSource;
  date: Date;
  description: string;
  createdAt: Date;
};
