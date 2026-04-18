import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../../..");
config({ path: [path.join(root, ".env.local"), path.join(root, ".env")] });

const main = async () => {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("🗑️  Resetting user data (preserving auth tables)...");

  // Only reset user-generated data tables, not auth tables
  const tables = [
    "entry_tags",
    "entries",
    "transactions",
    "recurring",
    "product_tags",
    "products",
    "tags",
  ];

  try {
    // Disable foreign key checks temporarily
    await db.execute(sql`SET session_replication_role = 'replica';`);

    // Truncate all user data tables
    for (const table of tables) {
      console.log(`  Truncating ${table}...`);
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE;`));
    }

    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = 'origin';`);

    console.log("✅ User data reset successfully!");
    console.log("ℹ️  Auth tables (user, session, account, verification) were preserved.");
  } catch (error) {
    // Re-enable foreign key checks even if there's an error
    await db.execute(sql`SET session_replication_role = 'origin';`);
    throw error;
  }
};

main()
  .catch((error) => {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
