import { InferSelectModel } from "drizzle-orm";
import { tags } from "./tags.schema";
import { Product } from "../products/products.models";

export type Tag = InferSelectModel<typeof tags>;
export type TagWithProduct = Tag & { products: Product[] };
