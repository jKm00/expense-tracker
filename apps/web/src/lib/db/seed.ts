import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../../..");
config({ path: [path.join(appRoot, ".env.local"), path.join(appRoot, ".env")] });

// Seeded random number generator for deterministic output
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.int(0, array.length - 1)];
  }

  weighted<T>(options: Array<{ weight: number; value: T }>): T {
    const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
    let random = this.next() * totalWeight;

    for (const option of options) {
      random -= option.weight;
      if (random <= 0) return option.value;
    }

    return options[options.length - 1].value;
  }

  boolean(probability = 0.5) {
    return this.next() < probability;
  }

  date(minDate: Date, maxDate: Date): Date {
    const min = minDate.getTime();
    const max = maxDate.getTime();
    return new Date(min + this.next() * (max - min));
  }
}

const main = async () => {
  const userId = process.argv[2];

  if (!userId) {
    console.error("❌ Error: User ID is required");
    console.log("Usage: npm run db:seed <user-id>");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL!);

  // Verify user exists
  const existingUser = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  if (existingUser.length === 0) {
    console.error(`❌ Error: User with ID "${userId}" does not exist`);
    console.log(
      "Please ensure the user is already created before seeding data",
    );
    process.exit(1);
  }

  console.log(
    `🌱 Seeding database for user: ${existingUser[0].name} (${userId})...`,
  );

  const rng = new SeededRandom(12345); // Use a fixed seed for reproducibility

  // Common data arrays
  const stores = [
    "Walmart",
    "Target",
    "Whole Foods",
    "Trader Joe's",
    "Costco",
    "Amazon",
    "Best Buy",
    "Home Depot",
    "IKEA",
    "Starbucks",
    "McDonald's",
    "Chipotle",
    "CVS Pharmacy",
    "Walgreens",
    "Shell Gas Station",
    "Local Grocery Store",
  ];

  const productNames = {
    groceries: [
      "Milk",
      "Bread",
      "Eggs",
      "Cheese",
      "Chicken Breast",
      "Ground Beef",
      "Salmon",
      "Apples",
      "Bananas",
      "Oranges",
      "Tomatoes",
      "Lettuce",
      "Broccoli",
      "Rice",
      "Pasta",
      "Coffee",
      "Tea",
      "Orange Juice",
      "Butter",
      "Yogurt",
    ],
    electronics: [
      "Laptop",
      "Phone",
      "Headphones",
      "Tablet",
      "Monitor",
      "Keyboard",
      "Mouse",
      "USB Cable",
      "Power Bank",
      "Smart Watch",
    ],
    home: [
      "Dish Soap",
      "Paper Towels",
      "Laundry Detergent",
      "Trash Bags",
      "Light Bulbs",
      "Furniture",
      "Bedding",
      "Towels",
      "Storage Bins",
      "Cleaning Supplies",
    ],
    entertainment: [
      "Movie Ticket",
      "Concert Ticket",
      "Streaming Subscription",
      "Video Game",
      "Book",
      "Magazine",
      "Sports Event Ticket",
    ],
    transport: [
      "Gas",
      "Bus Ticket",
      "Train Ticket",
      "Uber Ride",
      "Lyft Ride",
      "Parking Fee",
      "Toll Fee",
      "Car Wash",
    ],
    dining: [
      "Coffee",
      "Lunch",
      "Dinner",
      "Breakfast",
      "Snacks",
      "Dessert",
      "Drinks",
      "Fast Food",
      "Restaurant Meal",
    ],
    income: [
      "Salary",
      "Freelance Payment",
      "Bonus",
      "Investment Return",
      "Gift",
      "Refund",
      "Side Hustle",
    ],
  };

  const tagNames = [
    "Food",
    "Entertainment",
    "Transport",
    "Utilities",
    "Healthcare",
    "Shopping",
    "Education",
    "Personal",
    "Business",
    "Investment",
    "Savings",
    "Gifts",
    "Groceries",
    "Dining Out",
    "Electronics",
    "Home",
    "Travel",
    "Fitness",
    "Subscription",
    "Insurance",
    "Dairy",
    "Meat",
    "Produce",
    "Beverages",
    "Household",
    "Technology",
  ];

  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ];

  const minDate = new Date("2025-01-01");
  const maxDate = new Date("2026-04-30");

  console.log("Creating tags...");
  const tags: (typeof schema.tags.$inferSelect)[] = [];
  const tagMap = new Map<string, typeof schema.tags.$inferSelect>();
  for (let i = 0; i < 26; i++) {
    const tagName = tagNames[i];
    const [tag] = await db
      .insert(schema.tags)
      .values({
        userId,
        name: tagName,
        color: colors[i % colors.length],
        createdAt: rng.date(minDate, maxDate),
        updatedAt: rng.date(minDate, maxDate),
      })
      .returning();
    tags.push(tag);
    tagMap.set(tagName, tag);
  }

  console.log("Creating products...");
  const products = [];
  
  // Define which tags should be assigned to which product names
  const productTagMapping: Record<string, string[]> = {
    // Groceries - Dairy
    "Milk": ["Groceries", "Food", "Dairy", "Beverages"],
    "Cheese": ["Groceries", "Food", "Dairy"],
    "Butter": ["Groceries", "Food", "Dairy"],
    "Yogurt": ["Groceries", "Food", "Dairy"],
    
    // Groceries - Meat
    "Chicken Breast": ["Groceries", "Food", "Meat"],
    "Ground Beef": ["Groceries", "Food", "Meat"],
    "Salmon": ["Groceries", "Food", "Meat"],
    
    // Groceries - Produce
    "Apples": ["Groceries", "Food", "Produce"],
    "Bananas": ["Groceries", "Food", "Produce"],
    "Oranges": ["Groceries", "Food", "Produce"],
    "Tomatoes": ["Groceries", "Food", "Produce"],
    "Lettuce": ["Groceries", "Food", "Produce"],
    "Broccoli": ["Groceries", "Food", "Produce"],
    
    // Groceries - Pantry
    "Bread": ["Groceries", "Food"],
    "Eggs": ["Groceries", "Food"],
    "Rice": ["Groceries", "Food"],
    "Pasta": ["Groceries", "Food"],
    
    // Groceries - Beverages
    "Coffee": ["Groceries", "Food", "Beverages"],
    "Tea": ["Groceries", "Food", "Beverages"],
    "Orange Juice": ["Groceries", "Food", "Beverages", "Produce"],
    
    // Electronics
    "Laptop": ["Electronics", "Technology", "Shopping"],
    "Phone": ["Electronics", "Technology", "Shopping"],
    "Headphones": ["Electronics", "Technology", "Shopping"],
    "Tablet": ["Electronics", "Technology", "Shopping"],
    "Monitor": ["Electronics", "Technology", "Shopping"],
    "Keyboard": ["Electronics", "Technology", "Shopping"],
    "Mouse": ["Electronics", "Technology", "Shopping"],
    "USB Cable": ["Electronics", "Technology", "Shopping"],
    "Power Bank": ["Electronics", "Technology", "Shopping"],
    "Smart Watch": ["Electronics", "Technology", "Shopping"],
    
    // Home
    "Dish Soap": ["Home", "Household", "Shopping"],
    "Paper Towels": ["Home", "Household", "Shopping"],
    "Laundry Detergent": ["Home", "Household", "Shopping"],
    "Trash Bags": ["Home", "Household", "Shopping"],
    "Light Bulbs": ["Home", "Household", "Shopping"],
    "Furniture": ["Home", "Shopping"],
    "Bedding": ["Home", "Shopping"],
    "Towels": ["Home", "Shopping"],
    "Storage Bins": ["Home", "Shopping"],
    "Cleaning Supplies": ["Home", "Household", "Shopping"],
    
    // Entertainment
    "Movie Ticket": ["Entertainment"],
    "Concert Ticket": ["Entertainment"],
    "Streaming Subscription": ["Entertainment", "Subscription"],
    "Video Game": ["Entertainment", "Electronics"],
    "Book": ["Entertainment", "Education", "Shopping"],
    "Magazine": ["Entertainment", "Shopping"],
    "Sports Event Ticket": ["Entertainment"],
    
    // Transport
    "Gas": ["Transport", "Utilities"],
    "Bus Ticket": ["Transport", "Travel"],
    "Train Ticket": ["Transport", "Travel"],
    "Uber Ride": ["Transport"],
    "Lyft Ride": ["Transport"],
    "Parking Fee": ["Transport"],
    "Toll Fee": ["Transport"],
    "Car Wash": ["Transport", "Personal"],
    
    // Dining
    "Lunch": ["Dining Out", "Food"],
    "Dinner": ["Dining Out", "Food"],
    "Breakfast": ["Dining Out", "Food"],
    "Snacks": ["Dining Out", "Food"],
    "Dessert": ["Dining Out", "Food"],
    "Drinks": ["Dining Out", "Food", "Beverages"],
    "Fast Food": ["Dining Out", "Food"],
    "Restaurant Meal": ["Dining Out", "Food"],
    
    // Income
    "Salary": ["Business"],
    "Freelance Payment": ["Business"],
    "Bonus": ["Business"],
    "Investment Return": ["Investment", "Business"],
    "Gift": ["Gifts", "Personal"],
    "Refund": ["Personal"],
    "Side Hustle": ["Business"],
  };
  
  for (let i = 0; i < 100; i++) {
    const category = rng.weighted([
      { weight: 0.4, value: "groceries" },
      { weight: 0.15, value: "electronics" },
      { weight: 0.15, value: "home" },
      { weight: 0.1, value: "entertainment" },
      { weight: 0.1, value: "transport" },
      { weight: 0.05, value: "dining" },
      { weight: 0.05, value: "income" },
    ]) as keyof typeof productNames;

    const productName = rng.pick(productNames[category]);
    const [product] = await db
      .insert(schema.products)
      .values({
        userId,
        name: productName,
        createdAt: rng.date(minDate, maxDate),
        updatedAt: rng.date(minDate, maxDate),
      })
      .returning();
    products.push(product);
    
    // Link product to tags
    const tagNamesForProduct = productTagMapping[productName] || [];
    for (const tagName of tagNamesForProduct) {
      const tag = tagMap.get(tagName);
      if (tag) {
        await db.insert(schema.productTags).values({
          productId: product.id,
          tagId: tag.id,
        });
      }
    }
  }

  console.log("Creating transactions and entries...");
  let totalEntries = 0;

  for (let i = 0; i < 200; i++) {
    const transactionDate = rng.date(minDate, maxDate);
    const source = rng.weighted([
      { weight: 0.7, value: "manual" },
      { weight: 0.2, value: "recurring" },
      { weight: 0.1, value: "scan" },
    ]) as "manual" | "recurring" | "scan";

    // Determine number of entries for this transaction
    const entryCount = rng.weighted([
      { weight: 0.4, value: rng.int(1, 2) },
      { weight: 0.3, value: rng.int(3, 5) },
      { weight: 0.2, value: rng.int(6, 8) },
      { weight: 0.1, value: rng.int(9, 10) },
    ]);

    // Calculate total price from entries
    let totalPrice = 0;
    const entryData = [];

    for (let j = 0; j < entryCount; j++) {
      const price = rng.weighted([
        { weight: 0.6, value: rng.int(200, 3000) / 100 },
        { weight: 0.3, value: rng.int(3000, 10000) / 100 },
        { weight: 0.1, value: rng.int(10000, 50000) / 100 },
      ]);

      const quantity = rng.weighted([
        { weight: 0.6, value: 1 },
        { weight: 0.3, value: rng.int(2, 5) },
        { weight: 0.1, value: rng.int(6, 20) },
      ]);

      const type = rng.weighted([
        { weight: 0.9, value: "expense" },
        { weight: 0.1, value: "income" },
      ]) as "expense" | "income";

      const itemTotal = price * quantity;
      totalPrice += type === "income" ? itemTotal : -itemTotal;

      entryData.push({
        productId: rng.pick(products).id,
        price: price.toFixed(2),
        quantity,
        type,
      });
    }

    const [transaction] = await db
      .insert(schema.transactions)
      .values({
        userId,
        store: rng.pick(stores),
        description: rng.boolean(0.6)
          ? `Transaction #${i + 1} - ${rng.pick(stores)}`
          : null,
        source,
        totalPrice: totalPrice.toFixed(2),
        date: transactionDate,
        createdAt: transactionDate,
        updatedAt: transactionDate,
      })
      .returning();

    // Insert entries
    for (const entry of entryData) {
      await db.insert(schema.entries).values({
        transactionId: transaction.id,
        ...entry,
      });
      totalEntries++;
    }
  }

  console.log("Creating recurring entries...");
  for (let i = 0; i < 10; i++) {
    const price = rng.weighted([
      { weight: 0.4, value: rng.int(500, 5000) / 100 },
      { weight: 0.4, value: rng.int(5000, 20000) / 100 },
      { weight: 0.2, value: rng.int(20000, 200000) / 100 },
    ]);

    const interval = rng.weighted([
      { weight: 0.1, value: "weekly" },
      { weight: 0.7, value: "monthly" },
      { weight: 0.2, value: "yearly" },
    ]) as "weekly" | "monthly" | "yearly";

    const type = rng.weighted([
      { weight: 0.7, value: "expense" },
      { weight: 0.3, value: "income" },
    ]) as "expense" | "income";

    const start = rng.date(new Date("2024-01-01"), new Date("2024-06-30"));
    const end = rng.boolean(0.7)
      ? null
      : rng.date(new Date("2024-07-01"), new Date("2025-12-31"));

    await db.insert(schema.recurring).values({
      productId: rng.pick(products).id,
      price: price.toFixed(2),
      interval,
      type,
      start,
      end,
      isActive: rng.boolean(0.8),
      createdAt: start,
      updatedAt: start,
    });
  }

  console.log("\n✅ Database seeded successfully!");
  console.log("📊 Summary:");
  console.log(`  - 26 tags`);
  console.log(`  - 100 products (with tag associations)`);
  console.log(`  - 200 transactions`);
  console.log(`  - ${totalEntries} entries (transaction line items)`);
  console.log(`  - 10 recurring entries`);
};

main()
  .catch((error) => {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
