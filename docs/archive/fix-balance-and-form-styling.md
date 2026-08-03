# Fix: Net Balance Bug + SimpleTransactionForm Styling

## Bug 1: Net Balance Sign Inverted

### Root Cause

The recurring job at `apps/job/src/process-recurring.ts:118-139` stores `entry.price` as a **negative number** for expenses:

```ts
// Line 118-121
const signedPrice =
  rec.type === "expense"
    ? String(-Math.abs(Number(rec.price)))
    : String(Math.abs(Number(rec.price)));
```

Then on line 138, it saves this signed price as the entry price:
```ts
price: signedPrice,  // ← BUG: entry.price should always be positive
```

Meanwhile, `calculateAnalyticsMetrics` in `apps/web/src/features/analytics/analytics.calculations.ts:29-56` assumes `entry.price` is always positive and uses `entry.type` to determine sign:

```ts
const price = Number(entry.price) * entry.quantity;
if (entry.type === "expense") {
  netBalance -= price;  // If price is already -20, this does -= (-20) = +20 ❌
```

This causes double-negation: balance shows +20 instead of -20.

### Fix

**File: `apps/job/src/process-recurring.ts`**

Change lines 118-121 and 130, 138 to use unsigned price for entries and signed only for `totalPrice`:

```ts
// Line 118-121: keep signedPrice for totalPrice only
const signedPrice =
  rec.type === "expense"
    ? String(-Math.abs(Number(rec.price)))
    : String(Math.abs(Number(rec.price)));

const unsignedPrice = String(Math.abs(Number(rec.price)));
```

Line 130 — keep as-is (totalPrice uses signedPrice, which is correct):
```ts
totalPrice: signedPrice,
```

Line 138 — change to use unsigned price:
```diff
- price: signedPrice,
+ price: unsignedPrice,
```

### Data Migration Consideration

Existing recurring transactions in the DB already have negative `entry.price` values. You may need a one-time migration to fix them:

```sql
UPDATE entries SET price = ABS(price::numeric)::text
WHERE price::numeric < 0;
```

Or, alternatively, fix the calculation to handle both cases by using `Math.abs()`:

**Alternative fix (defensive, no migration needed) — `apps/web/src/features/analytics/analytics.calculations.ts:30`:**

```diff
- const price = Number(entry.price) * entry.quantity;
+ const price = Math.abs(Number(entry.price)) * entry.quantity;
```

**Recommendation:** Apply BOTH fixes — fix the recurring job so new data is correct, AND add `Math.abs()` in the calculation as a defensive measure against existing bad data.

---

## Bug 2: SimpleTransactionForm Responsive Sizing

### Current State

All inputs/buttons have `h-11 text-base` hardcoded (always large).

### Files to Change

#### 1. `apps/web/src/features/transactions/components/simple-transaction.form.tsx`

**Line 94** — Input className:
```diff
- className="h-11 text-base px-3"
+ className="h-11 md:h-9 text-base md:text-sm px-3"
```

**Line 103** — Expense button className:
```diff
- className="h-11 border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
+ className="h-11 md:h-9 border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
```

**Line 112** — Income button className:
```diff
- className="h-11 border-expense/30 text-income hover:bg-income/10 hover:text-income"
+ className="h-11 md:h-9 border-income/30 text-income hover:bg-income/10 hover:text-income"
```

#### 2. `apps/web/src/components/custom/product-select.tsx`

**Line 62** — PopoverTrigger Button className:
```diff
- className="h-11 w-full justify-between font-normal text-base"
+ className="h-11 md:h-9 w-full justify-between font-normal text-base md:text-sm"
```

---

## Design Tweak: Form Card Styling

### Context

The dashboard page (`apps/web/src/routes/_app/dashboard/index.tsx`) uses the `FinancialOverview` component which has this card style:
```
className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5 space-y-4"
```

The `SimpleTransactionForm` uses the shadcn `<Card>` component which has its own default styling (border, rounded-xl, shadow-sm, etc). This feels inconsistent.

### Fix

**File: `apps/web/src/features/transactions/components/simple-transaction.form.tsx`**

Replace the `<Card>` / `<CardContent>` / `<CardFooter>` with a plain `div` that matches the financial-overview style:

```diff
- <Card>
-   <CardContent className="space-y-5">
+ <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5 space-y-5">
```

```diff
-   </CardContent>
-   <CardFooter className="grid grid-cols-2 gap-3">
+   <div className="grid grid-cols-2 gap-3">
```

```diff
-   </CardFooter>
- </Card>
+   </div>
+ </div>
```

Also remove the unused imports:
```diff
- import { Card, CardContent, CardFooter } from "@/components/ui/card";
```

This makes the form card visually consistent with the FinancialOverview component above it on the dashboard — same `rounded-2xl`, `bg-card`, `ring-1 ring-foreground/10` treatment.
