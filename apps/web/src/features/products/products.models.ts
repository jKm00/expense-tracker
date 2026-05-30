import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { products, productAliases } from "./products.schema";
import { Tag } from "../tags/tags.models";

export type Product = InferSelectModel<typeof products>;
export type ProductAlias = InferSelectModel<typeof productAliases>;
export type NewProductAlias = InferInsertModel<typeof productAliases>;
export type ProductWithTag = Product & {
  tags: Tag[];
  aliases: ProductAlias[];
};
export type ProductWithDetails = ProductWithTag;


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
