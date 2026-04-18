import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import { relations } from "./relations.js";

export function createDb(databaseUrl: string) {
  return drizzle(databaseUrl, { schema, relations });
}

export type Database = ReturnType<typeof createDb>;

export * from "./schema.js";
export { relations } from "./relations.js";
