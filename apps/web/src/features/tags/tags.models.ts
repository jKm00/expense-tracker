import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { tags } from "./tags.schema";
import { Product } from "../products/products.models";

export type Tag = InferSelectModel<typeof tags>;
export type TagWithProduct = Tag & { products: Product[] };

export type NewTag = InferInsertModel<typeof tags>;
export type UpdateTag = Partial<
  Omit<NewTag, "id" | "userId" | "createdAt" | "updatedAt">
>;

export type TagPage = {
  tags: TagWithProduct[];
  nextOffset: number | null;
  hasMore: boolean;
};

export type TagKpis = {
  count: number;
  averageReferences: number;
  mostUsedTagName: string | null;
};
