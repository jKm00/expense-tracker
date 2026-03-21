import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { Tag } from "./tag.models";
import { recurringProduct } from "./product.schema";

export type Product = {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductWithTags = Product & { tags: Tag[] };

export type RecurringProduct = InferSelectModel<typeof recurringProduct>;
export type NewRecurringProduct = InferInsertModel<typeof recurringProduct>;
export type RecurringInterval = "weekly" | "monthly" | "yearly";

export type RecurringWithProduct = RecurringProduct & { product: Product };
