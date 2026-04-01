import { InferSelectModel } from "drizzle-orm";
import { tags } from "./tags.schema";

export type Tag = InferSelectModel<typeof tags>;
