# Dashboard Home Page Redesign Plan

> **Goal**: Make the dashboard home page consistent with the rest of the app (analytics, products, transactions pages) by using the same component patterns: `PageHeader`, `KpiCard`, `Card`.

## Overview of Changes

| File | What changes |
|------|-------------|
| `apps/web/src/features/analytics/components/financial-overview.tsx` | Replace custom card with 3 `KpiCard` components in a grid |
| `apps/web/src/features/transactions/components/simple-transaction.form.tsx` | Wrap form in `Card`/`CardHeader`/`CardContent` |
| `apps/web/src/routes/_app/dashboard/index.tsx` | Update skeleton to use `KpiCardSkeleton`, clean up layout |

---

## 1. `financial-overview.tsx` — Replace custom card with KpiCards

**File**: `apps/web/src/features/analytics/components/financial-overview.tsx`

Replace the entire file contents with:

```tsx
import { FullTransaction } from "@/features/transactions/transactions.models";
import { calculateAnalyticsMetrics } from "@/features/analytics/analytics.calculations";
import { currencyFormatterNoDecimals } from "@/features/analytics/analytics.constants";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { Scale, TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";

type FinancialOverviewProps = {
  transactions: FullTransaction[];
};

export function FinancialOverview({ transactions }: FinancialOverviewProps) {
  const metrics = useMemo(
    () => calculateAnalyticsMetrics(transactions),
    [transactions],
  );

  return (
    <section className="grid gap-3 grid-cols-3">
      <KpiCard
        title="Balance"
        value={currencyFormatterNoDecimals.format(metrics.netBalance)}
        icon={Scale}
      />
      <KpiCard
        title="Income"
        value={currencyFormatterNoDecimals.format(metrics.totalIncome)}
        icon={TrendingUp}
      />
      <KpiCard
        title="Expenses"
        value={currencyFormatterNoDecimals.format(metrics.totalExpenses)}
        icon={TrendingDown}
      />
    </section>
  );
}
```

**What changed**:
- Removed the custom `rounded-2xl bg-card ring-1 ring-foreground/10` wrapper
- Removed the custom balance display and income/expense sub-cards
- Now uses 3 `KpiCard` components in a `grid-cols-3` grid — same pattern as `hero-kpis.tsx` (line 45) on the analytics page
- Uses `currencyFormatterNoDecimals` (same as before) for the values
- Icons match the analytics page: `Scale`, `TrendingUp`, `TrendingDown`
- No `subtitle` or `delta` props — this is the simple dashboard view, not the full analytics comparison view

---

## 2. `simple-transaction.form.tsx` — Use Card component

**File**: `apps/web/src/features/transactions/components/simple-transaction.form.tsx`

Replace the entire file contents with:

```tsx
import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { ProductSelect } from "@/components/custom/product-select";
import { LoaderButton } from "@/components/custom/loader.button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Product } from "@/features/products/products.models";
import { saveEntrySchema } from "../transactions.dtos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { EntryType } from "../transactions.models";
import { transactionMutations } from "../transactions.mutations";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";

export function SimpleTransactionForm({ products }: { products: Product[] }) {
  const mutation = transactionMutations.saveTransaction();

  const {
    register,
    getValues,
    setValue,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      quantity: "1",
    },
    resolver: zodResolver(saveEntrySchema),
  });

  const onSubmit = (type: EntryType) => {
    setValue("type", type);
    handleSubmit((data) => {
      mutation.mutate(
        {
          source: "manual",
          entries: [data],
          date: new Date(),
        },
        {
          onSuccess: (res) => {
            const [error] = res;
            if (error) {
              toast.error(error.message);
            } else {
              toast.success("Transaction saved");
              reset();
            }
          },
        },
      );
    })();
  };

  function handleProductSelect(product: Product) {
    const isNewProduct = product.id.length === 0;
    if (isNewProduct) {
      setValue("product", {
        id: null,
        name: product.name,
      });
    } else {
      setValue("product", product);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Log</CardTitle>
        <CardDescription>Add a transaction</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <FormField>
            <FormFieldLabel>Product</FormFieldLabel>
            <ProductSelect
              products={products}
              defaultValue={getValues("product.id") ?? undefined}
              onValueChange={handleProductSelect}
            />
            <FormFieldError>
              {errors.product && "Must select a product"}
            </FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>Price</FormFieldLabel>
            <Input
              {...register("price")}
              inputMode="decimal"
              placeholder="123.45,-"
              className="h-11 md:h-9 text-base md:text-sm px-3"
            />
            <FormFieldError>{errors.price?.message}</FormFieldError>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <LoaderButton
              onClick={() => onSubmit("expense")}
              variant="outline"
              className="h-11 md:h-9 border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
              type="button"
              isLoading={mutation.isPending}
            >
              <Minus className="size-4" />
              Expense
            </LoaderButton>
            <LoaderButton
              onClick={() => onSubmit("income")}
              variant="outline"
              className="h-11 md:h-9 border-income/30 text-income hover:bg-income/10 hover:text-income"
              type="button"
              isLoading={mutation.isPending}
            >
              <Plus className="size-4" />
              Income
            </LoaderButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

**What changed**:
- Replaced the manual `rounded-2xl bg-card ring-1 ring-foreground/10 p-5` wrapper with `Card` > `CardHeader` + `CardContent`
- Added `CardHeader` with `CardTitle` ("Quick Log") and `CardDescription` ("Add a transaction") — matches the pattern in `edit-product.form.tsx` (line 77-81)
- Moved `<form>` inside `CardContent` with `space-y-4` for field spacing
- All form fields, inputs, buttons remain identical — no functional changes
- Mobile touch targets (`h-11 md:h-9`) preserved on inputs and buttons

---

## 3. `index.tsx` — Update skeleton and layout

**File**: `apps/web/src/routes/_app/dashboard/index.tsx`

Replace the entire file contents with:

```tsx
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { KpiCardSkeleton } from "@/features/analytics/components/analytics-skeletons";
import { FinancialOverview } from "@/features/analytics/components/financial-overview";
import { productQueries } from "@/features/products/products.queries";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { SimpleTransactionForm } from "@/features/transactions/components/simple-transaction.form";
import { useAuth } from "@/features/auth/auth.provider";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/")({
  loader: async ({ context }) => {
    const now = new Date();
    await Promise.all([
      context.queryClient.prefetchQuery(productQueries.getProductsOptions()),
      context.queryClient.prefetchQuery(
        transactionQueries.getTransactionsOptions(
          now.getFullYear(),
          now.getMonth(),
        ),
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

      <Suspense fallback={<FinancialOverviewSkeleton />}>
        <FinancialOverviewSection />
      </Suspense>

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
    transactionQueries.getTransactionsOptions(
      now.getFullYear(),
      now.getMonth(),
    ),
  );

  return <FinancialOverview transactions={transactions || []} />;
}

function FinancialOverviewSkeleton() {
  return (
    <section className="grid gap-3 grid-cols-3">
      <KpiCardSkeleton />
      <KpiCardSkeleton />
      <KpiCardSkeleton />
    </section>
  );
}

function HomeContent() {
  const {
    data: [_, products],
  } = useSuspenseQuery(productQueries.getProductsOptions());

  return <SimpleTransactionForm products={products || []} />;
}
```

**What changed**:
- Replaced `Skeleton` import with `KpiCardSkeleton` from `analytics-skeletons.tsx`
- `FinancialOverviewSkeleton` now renders 3 `KpiCardSkeleton` in a `grid-cols-3` grid — matches the real `FinancialOverview` layout exactly
- Removed the old custom skeleton with `rounded-2xl bg-card ring-1` wrapper
- Everything else (PageHeader, Suspense boundaries, data fetching) stays the same

---

## Summary

The page layout after this change:

```
┌─────────────────────────────────┐
│ PageHeader                      │
│   "Hey, {name}"                 │
│   "Quickly log a transaction"   │
├─────────────────────────────────┤
│ ┌─────────┐┌─────────┐┌───────┐│
│ │ Balance  ││ Income  ││Expense││  ← 3 KpiCards (same as analytics)
│ │ kr 1 234 ││ kr 5 000││kr 3766││
│ └─────────┘└─────────┘└───────┘│
├─────────────────────────────────┤
│ Card: "Quick Log"               │
│ ┌─ Product ───────────────────┐ │
│ │ Select product          ▸   │ │
│ └─────────────────────────────┘ │
│ ┌─ Price ─────────────────────┐ │
│ │ 123.45,-                    │ │
│ └─────────────────────────────┘ │
│ ┌──────────┐ ┌────────────────┐ │
│ │- Expense │ │  + Income      │ │
│ └──────────┘ └────────────────┘ │
└─────────────────────────────────┘
```

No new components created. No new dependencies. Just reusing existing patterns (`KpiCard`, `Card`, `KpiCardSkeleton`) that are already used across the app.
