import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { processRecurringTransactions } from "./process-recurring.js";
import { createDb } from "./db/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });   // apps/job/.env.local
config({ path: resolve(__dirname, "../.env") });          // apps/job/.env

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = createDb(databaseUrl);
  const today = new Date();

  console.log(`[recurring-job] Starting for date: ${today.toISOString().split("T")[0]}`);

  try {
    const result = await processRecurringTransactions(db, today);
    console.log(`[recurring-job] Done. Created ${result.created} transactions, skipped ${result.skipped}.`);
    process.exit(0);
  } catch (error) {
    console.error("[recurring-job] Fatal error:", error);
    process.exit(1);
  }
}

main();
