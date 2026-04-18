import { createDb } from "@expense-tracker/db";

export const db = createDb(process.env.DATABASE_URL!);
