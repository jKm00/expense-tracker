import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { relations } from "./relations";

function createDb(databaseUrl: string) {
  return drizzle(databaseUrl, { schema, relations });
}

export const db = createDb(process.env.DATABASE_URL!);
