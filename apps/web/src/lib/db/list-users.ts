import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../../..");
config({ path: [path.join(appRoot, ".env.local"), path.join(appRoot, ".env")] });

const main = async () => {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("📋 Fetching all users...\n");

  const users = await db.select().from(schema.user);

  if (users.length === 0) {
    console.log("❌ No users found in the database");
    console.log("Please create a user account first through authentication");
    process.exit(1);
  }

  console.log(`Found ${users.length} user(s):\n`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log();
  });

  console.log("To seed data for a user, run:");
  console.log(`npm run db:seed ${users[0].id}`);
};

main()
  .catch((error) => {
    console.error("❌ Error fetching users:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
