import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { tag } from "./tag.schema";

export type Tag = InferSelectModel<typeof tag>;
export type NewTag = InferInsertModel<typeof tag>;
