import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { recurringProduct } from "./recurring.schema";
import { Product } from "../products/product.models";
import type { TransactionType } from "../transactions/transaction.models";

export type RecurringProduct = InferSelectModel<typeof recurringProduct>;
export type NewRecurringProduct = InferInsertModel<typeof recurringProduct>;
export type UpdateRecurringProduct = Partial<Omit<NewRecurringProduct, "createdAt" | "updatedAt">>;
export type RecurringInterval = "weekly" | "monthly" | "yearly";
export type RecurringType = TransactionType;

export type RecurringWithProduct = RecurringProduct & { product: Product };
