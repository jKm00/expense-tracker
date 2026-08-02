# Dashboard Financial Overview & Mobile UX Plan

## Overview
Spice up the home/dashboard page with a premium financial overview widget and improve the SimpleTransactionForm for mobile usability.

---

## 1. Financial Overview Widget

### New File: `apps/web/src/features/analytics/components/financial-overview.tsx`

A hero card showing balance, income, and expenses for the current month. Design direction: **refined fintech** — clean, confident typography with the balance as the dominant focal point (like Revolut/N26 home screens).

#### Design Spec

```
┌─────────────────────────────────────┐
│                                     │
│  Your Balance                       │
│  kr 12 450                          │  ← Large, bold, dominant
│                                     │
│  ┌───────────────┬────────────────┐ │
│  │ ↑ Income      │ ↓ Expenses     │ │
│  │ kr 24 000     │ kr 11 550      │ │
│  └───────────────┴────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

#### Implementation

```tsx
// apps/web/src/features/analytics/components/financial-overview.tsx

import { FullTransaction } from "@/features/transactions/transactions.models";
import { calculateAnalyticsMetrics } from "@/features/analytics/analytics.calculations";
import { currencyFormatterNoDecimals } from "@/features/analytics/analytics.constants";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";

type FinancialOverviewProps = {
  transactions: FullTransaction[];
};

export function FinancialOverview({ transactions }: FinancialOverviewProps) {
  const metrics = useMemo(
    () => calculateAnalyticsMetrics(transactions),
    [transactions],
  );

  const isPositive = metrics.netBalance >= 0;

  return (
    <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5 space-y-4">
      {/* Balance — dominant element */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Your Balance
        </p>
        <p
          className={cn(
            "text-3xl font-bold tracking-tight mt-1",
            isPositive ? "text-foreground" : "text-expense",
          )}
        >
          {currencyFormatterNoDecimals.format(metrics.netBalance)}
        </p>
      </div>

      {/* Income / Expense row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-income/8 px-3 py-2.5">
          <div className="size-8 rounded-full bg-income/15 grid place-items-center shrink-0">
            <ArrowUpRight className="size-4 text-income" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">Income</p>
            <p className="text-sm font-semibold tracking-tight truncate">
              {currencyFormatterNoDecimals.format(metrics.totalIncome)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-expense/8 px-3 py-2.5">
          <div className="size-8 rounded-full bg-expense/15 grid place-items-center shrink-0">
            <ArrowDownLeft className="size-4 text-expense" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">Expenses</p>
            <p className="text-sm font-semibold tracking-tight truncate">
              {currencyFormatterNoDecimals.format(metrics.totalExpenses)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key design choices:**
- Balance is `text-3xl font-bold` — the hero element, immediately scannable
- Income/expense in subtle tinted pill-cards using existing `--income` and `--expense` CSS variables
- Circular icon containers with `bg-income/15` and `bg-expense/15` for a soft, modern look
- `rounded-2xl` for the outer card (larger radius than standard cards) for a premium feel
- `currencyFormatterNoDecimals` for cleaner, more scannable numbers at this scale
- Balance turns `text-expense` (red) when negative — instant visual feedback
- No `<Card>` component used — custom div for full control over the premium aesthetic

---

## 2. Dashboard Page Updates

### File: `apps/web/src/routes/_app/dashboard/index.tsx`

#### Changes Required

1. **Import** `transactionQueries` and `FinancialOverview`
2. **Prefetch** current month's transactions in the route loader
3. **Render** `FinancialOverview` above the form
4. **Adjust layout** for a premium mobile-first feel

#### Full Updated File

```tsx
// apps/web/src/routes/_app/dashboard/index.tsx

import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { productQueries } from "@/features/products/products.queries";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { SimpleTransactionForm } from "@/features/transactions/components/simple-transaction.form";
import { FinancialOverview } from "@/features/analytics/components/financial-overview";
import { useAuth } from "@/features/auth/auth.provider";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/dashboard/")({
  loader: async ({ context }) => {
    const now = new Date();
    await Promise.all([
      context.queryClient.prefetchQuery(productQueries.getProductsOptions()),
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionsOptions(now.getFullYear(), now.getMonth()),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Hey, {firstName}</PageHeaderTitle>
        <PageHeaderDescription>
          Quickly log a transaction below.
        </PageHeaderDescription>
      </PageHeader>

      {/* Financial overview with skeleton fallback */}
      <Suspense fallback={<FinancialOverviewSkeleton />}>
        <FinancialOverviewSection />
      </Suspense>

      {/* Transaction form */}
      <Suspense>
        <HomeContent />
      </Suspense>
    </div>
  );
}

function FinancialOverviewSection() {
  const now = new Date();
  const {
    data: [_, transactions],
  } = useSuspenseQuery(
    transactionQueries.getTransactionsOptions(now.getFullYear(), now.getMonth()),
  );

  return <FinancialOverview transactions={transactions || []} />;
}

function FinancialOverviewSkeleton() {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  );
}

function HomeContent() {
  const {
    data: [_, products],
  } = useSuspenseQuery(productQueries.getProductsOptions());

  return <SimpleTransactionForm products={products || []} />;
}
```

**Important note on `getTransactionsOptions`:** The existing query at `apps/web/src/features/transactions/transactions.queries.ts:6-17` takes `year?: number, month?: number`. Check that the month parameter uses **0-indexed months** (JavaScript `Date.getMonth()` returns 0-11). If the API expects 1-indexed months, change `now.getMonth()` to `now.getMonth() + 1`. Verify by checking `transactionController.getTransactions` implementation.

---

## 3. SimpleTransactionForm Mobile UX Improvements

### File: `apps/web/src/features/transactions/components/simple-transaction.form.tsx`

The current form has `h-8` inputs (32px) and `h-8` buttons — too small for comfortable mobile touch targets. Apple recommends 44px minimum.

#### Changes (line-by-line diffs)

**Line 76: Increase card content spacing**
```diff
- <CardContent className="space-y-4">
+ <CardContent className="space-y-5">
```

**Line 90: Larger price input with bigger text**
```diff
- <Input {...register("price")} inputMode="decimal" placeholder="123.45,-" />
+ <Input
+   {...register("price")}
+   inputMode="decimal"
+   placeholder="123.45,-"
+   className="h-11 text-base px-3"
+ />
```

**Line 94: Taller footer buttons with more padding**
```diff
- <CardFooter className="grid grid-cols-2 gap-2">
+ <CardFooter className="grid grid-cols-2 gap-3">
```

**Lines 95-104: Expense button — add `size="lg"` and increase icon + height**
```diff
- <LoaderButton
-   onClick={() => onSubmit("expense")}
-   variant="outline"
-   className="border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
-   type="button"
-   isLoading={mutation.isPending}
- >
-   <Minus className="size-3.5" />
-   Expense
- </LoaderButton>
+ <LoaderButton
+   onClick={() => onSubmit("expense")}
+   variant="outline"
+   className="h-11 border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
+   type="button"
+   isLoading={mutation.isPending}
+ >
+   <Minus className="size-4" />
+   Expense
+ </LoaderButton>
```

**Lines 105-114: Income button — same treatment**
```diff
- <LoaderButton
-   onClick={() => onSubmit("income")}
-   variant="outline"
-   className="border-income/30 text-income hover:bg-income/10 hover:text-income"
-   type="button"
-   isLoading={mutation.isPending}
- >
-   <Plus className="size-3.5" />
-   Income
- </LoaderButton>
+ <LoaderButton
+   onClick={() => onSubmit("income")}
+   variant="outline"
+   className="h-11 border-income/30 text-income hover:bg-income/10 hover:text-income"
+   type="button"
+   isLoading={mutation.isPending}
+ >
+   <Plus className="size-4" />
+   Income
+ </LoaderButton>
```

**Additionally — the ProductSelect component** at line 79-83 likely also renders a small trigger button. The implementer should check `apps/web/src/components/custom/product-select.tsx` and ensure its trigger/combobox button also gets `h-11` height to match. Apply `className="h-11 text-base"` to the trigger element if it accepts a className prop, or wrap it with a size override.

#### Summary of Touch Target Changes

| Element | Before | After |
|---------|--------|-------|
| Price input | `h-8` (32px) | `h-11` (44px) |
| Expense button | `h-8` (32px) | `h-11` (44px) |
| Income button | `h-8` (32px) | `h-11` (44px) |
| ProductSelect | `h-8` (32px) | `h-11` (44px) — verify |
| Button icons | `size-3.5` (14px) | `size-4` (16px) |
| Card spacing | `space-y-4` | `space-y-5` |
| Footer gap | `gap-2` | `gap-3` |

---

## 4. Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/features/analytics/components/financial-overview.tsx` | **CREATE** | New financial overview widget |
| `apps/web/src/routes/_app/dashboard/index.tsx` | **MODIFY** | Add overview section, prefetch transactions, add skeleton |
| `apps/web/src/features/transactions/components/simple-transaction.form.tsx` | **MODIFY** | Larger inputs/buttons for mobile |
| `apps/web/src/components/custom/product-select.tsx` | **VERIFY** | May need height increase on trigger |

## 5. Verification Checklist

- [ ] `FinancialOverview` renders balance, income, expenses correctly
- [ ] Negative balance shows in `text-expense` color
- [ ] Skeleton shows while transactions load
- [ ] Month parameter indexing is correct (0-indexed vs 1-indexed)
- [ ] All touch targets are ≥44px on mobile
- [ ] ProductSelect trigger matches the new input height
- [ ] Dark mode looks correct (uses CSS variables, should work automatically)
- [ ] Form still submits correctly after layout changes
