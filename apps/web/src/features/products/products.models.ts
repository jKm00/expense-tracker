import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products } from "./products.schema";
import { Tag } from "../tags/tags.models";

export type Product = InferSelectModel<typeof products>;
export type ProductWithTag = Product & { tags: Tag[] };

export type NewProduct = InferInsertModel<typeof products>;
export type UpdateProduct = Partial<
  Omit<NewProduct, "id" | "userId" | "createdAt" | "updatedAt">
>;
