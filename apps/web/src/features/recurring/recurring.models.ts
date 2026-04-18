import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { recurring } from "./recurring.schema";
import { Product } from "../products/products.models";

export const recurringIntervals = ["weekly", "monthly", "yearly"] as const;
export type RecurringInterval = (typeof recurringIntervals)[number];

export type Recurring = InferSelectModel<typeof recurring>;
export type RecurringWithProduct = Recurring & { products: Product | null };
export type NewRecurring = InferInsertModel<typeof recurring>;
export type UpdateRecurring = Partial<
  Omit<NewRecurring, "id" | "createdAt" | "updatedAt" | "deletedAt">
>;
