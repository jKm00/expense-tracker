# Database Seeding

Generate realistic test data for development. Uses deterministic random generation so you get the same data every time.

## Quick Start

**1. Find your user ID:**

```bash
pnpm db:list-users
```

**2. Seed data:**

```bash
pnpm db:seed <user-id>
```

**3. Reset data (keeps auth):**

```bash
pnpm db:reset
```

## What Gets Created

- 20 tags
- 100 products (groceries, electronics, home goods, etc.)
- 200 transactions with realistic stores and dates
- ~400-800 entries (transaction line items)
- 10 recurring entries

## How It Works

The seed script (`src/lib/db/seed.ts`) uses a custom random number generator with weighted distributions to create realistic data. Products are categorized (40% groceries, 15% electronics, etc.), transactions have 1-10 items each, and prices range from $2-$500 with most being smaller amounts.

To customize, edit the arrays and weights in `src/lib/db/seed.ts`.
