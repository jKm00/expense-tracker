import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products, productAliases } from "@/features/products/server/products.schema";
import type { Tag } from "@/features/tags/shared/tags.models";

export type Product = InferSelectModel<typeof products>;
export type ProductAlias = InferSelectModel<typeof productAliases>;
export type ProductWithTag = Product & {
  tags: Tag[];
  aliases: ProductAlias[];
};
export type ProductWithDetails = ProductWithTag;

export type ProductTagRow = {
  productId: string;
  tagId: string;
  tagName: string;
  tagColor: string | null;
};

export type NewProduct = InferInsertModel<typeof products>;
export type UpdateProduct = Partial<
  Omit<NewProduct, "id" | "userId" | "createdAt" | "updatedAt">
>;

export type ProductPage = {
  products: ProductWithTag[];
  nextOffset: number | null;
  hasMore: boolean;
};

export type ProductKpis = {
  total: number;
  tagged: number;
  untagged: number;
};
