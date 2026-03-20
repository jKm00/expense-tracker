import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { tag } from "./product.schema";

export type Tag = InferSelectModel<typeof tag>;
export type NewTag = InferInsertModel<typeof tag>;
