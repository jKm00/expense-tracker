import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { shortcuts } from "./shortcuts.schema";

export type Shortcut = InferSelectModel<typeof shortcuts>;
export type NewShortcut = InferInsertModel<typeof shortcuts>;
export type ShortcutProduct = { id: string; name: string };
export type ShortcutWithProducts = Shortcut & { products: ShortcutProduct[] };
