import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products } from "@/features/products/server/products.schema";
import { tags } from "@/features/tags/server/tags.schema";

export type Tag = InferSelectModel<typeof tags>;
export type TagProduct = InferSelectModel<typeof products>;
export type TagWithProduct = Tag & { products: TagProduct[] };

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
