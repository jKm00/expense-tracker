# Batch 5: Transactions Redesign

> **Plan:** Phase 3: Full Redesign
> **Goal:** Complete visual overhaul — dark-mode-first theme, responsive layouts, skeleton loaders, standardized error handling, and consistent shadcn component usage.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 17: Create `transaction-list-item.tsx` Component

**Depends on:** Task 1 (needs Card component)
**Can parallelize with:** Task 18 (but 18 depends on 17)

**Files:**
- Create: `src/features/transactions/components/transaction-list-item.tsx`

**Context:** A card-style row for displaying a single transaction. Shows product name (bold), optional description (muted, truncated), price (green for income, red for expense), and date. The entire card is wrapped in a `<Link>` making it tappable/clickable to navigate to the transaction detail page.

**Step 1: Create the component**

Create `src/features/transactions/components/transaction-list-item.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import type { TransactionWithProduct } from "../transaction.models";

export function TransactionListItem({
  row,
}: {
  row: TransactionWithProduct;
}) {
  const { transaction, product } = row;

  return (
    <Link
      to="/dashboard/transactions/$id"
      params={{ id: transaction.id }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="flex items-center justify-between py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">
              {product?.name ?? "Unknown"}
            </p>
            {transaction.description && (
              <p className="text-sm text-muted-foreground truncate">
                {transaction.description}
              </p>
            )}
          </div>
          <div className="text-right ml-4 shrink-0">
            <p
              className={`font-semibold ${
                transaction.type === "income"
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {transaction.type === "income" ? "+" : "-"}
              {Number(transaction.price).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{transaction.date}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/features/transactions/components/transaction-list-item.tsx
git commit -m "feat(transactions): add TransactionListItem card component"
```

---

## Task 18: Create `transaction-list.tsx` Component

**Depends on:** Tasks 6 (EmptyState), 17 (TransactionListItem)
**Can parallelize with:** Nothing in this batch

**Files:**
- Create: `src/features/transactions/components/transaction-list.tsx`

**Context:** Extracted transaction list component that receives the query data, handles error/empty states, and renders `TransactionListItem` cards. This component is used by both the transactions route and could be reused for the dashboard recent transactions.

**Step 1: Create the component**

Create `src/features/transactions/components/transaction-list.tsx`:

```tsx
import { EmptyState } from "@/components/custom/empty-state";
import { TransactionListItem } from "./transaction-list-item";
import { ReceiptTextIcon } from "lucide-react";
import type { TransactionWithProduct } from "../transaction.models";

export function TransactionList({
  transactions,
}: {
  transactions: TransactionWithProduct[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        message="No transactions yet. Add your first transaction from the dashboard."
        icon={ReceiptTextIcon}
      />
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((row) => (
        <TransactionListItem key={row.transaction.id} row={row} />
      ))}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/features/transactions/components/transaction-list.tsx
git commit -m "feat(transactions): add TransactionList component with empty state"
```

---

## Task 19: Rewrite `_app.dashboard.transactions.tsx`

**Depends on:** Tasks 5 (PageHeader), 8 (SkeletonList), 18 (TransactionList)
**Can parallelize with:** Task 20

**Files:**
- Modify: `src/routes/_app.dashboard.transactions.tsx` (complete rewrite)

**Context:** The current transactions page renders an inline `TransactionsList` function with raw `<ul>/<li>` markup and `<p>Loading...</p>` fallback. The rewrite extracts the list to the new `TransactionList` component, adds a `PageHeader`, uses `SkeletonList` for the loading state, and handles errors with proper messages.

**Step 1: Rewrite the transactions route**

Replace the entire content of `src/routes/_app.dashboard.transactions.tsx` with:

```tsx
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { TransactionList } from "@/features/transactions/components/transaction-list";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeleton-list";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions,
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" />
      <Suspense fallback={<SkeletonList rows={8} />}>
        <TransactionsContent />
      </Suspense>
    </div>
  );
}

function TransactionsContent() {
  const { data } = useSuspenseQuery(transactionQueries.getTransactionsOptions);
  const [err, transactions] = data;

  if (err) {
    return <p className="text-muted-foreground">Failed to load transactions.</p>;
  }

  return <TransactionList transactions={transactions} />;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server and:
1. Navigate to `/dashboard/transactions` — verify styled card-style list items appear
2. Verify income transactions show green prices, expense transactions show red
3. Click a transaction — verify it navigates to the detail page
4. If there are no transactions, verify the empty state message appears

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.transactions.tsx
git commit -m "feat(transactions): redesign transactions list with PageHeader, skeleton, and card items"
```

---

## Task 20: Rewrite `_app.dashboard.transactions.$id.tsx`

**Depends on:** Tasks 5 (PageHeader), 6 (EmptyState), 8 (SkeletonForm), 13 (getErrorMessage)
**Can parallelize with:** Task 19

**Files:**
- Modify: `src/routes/_app.dashboard.transactions.$id.tsx` (rewrite with skeleton + PageHeader + EmptyState for errors)

**Context:** The current transaction detail page uses raw `<p>Loading...</p>` and `<p>` tags for errors. The rewrite adds a `SkeletonForm` loading state, uses `PageHeader`, and replaces the error `<p>` tags with `EmptyState` components using `getErrorMessage()` for user-friendly messages. The existing `EditTransactionForm` and `DeleteTransactionDialog` components are kept as-is — they already use TanStack Form and shadcn components from Phase 1.

**Step 1: Rewrite the transaction detail route**

Replace the entire content of `src/routes/_app.dashboard.transactions.$id.tsx` with:

```tsx
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { EditTransactionForm } from "@/features/transactions/components/edit-transaction.form";
import { DeleteTransactionDialog } from "@/features/transactions/components/delete-transaction.alert";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeleton-form";
import { EmptyState } from "@/components/custom/empty-state";
import { getErrorMessage } from "@/utils/error-messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { FormField } from "@/components/custom/form-field";

export const Route = createFileRoute("/_app/dashboard/transactions/$id")({
  loader: async ({ context, params }) => {
    const id = params.id;
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionOptions(id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Edit Transaction" />
      <Suspense fallback={<SkeletonForm fields={5} />}>
        <TransactionDetail />
      </Suspense>
    </div>
  );
}

function TransactionDetail() {
  const { id } = Route.useParams();

  const { data } = useSuspenseQuery(
    transactionQueries.getTransactionOptions(id),
  );
  const [err, transactionWithProduct] = data;

  if (err) {
    return (
      <EmptyState
        message={getErrorMessage(err)}
        icon={AlertTriangleIcon}
      />
    );
  }

  const transaction = transactionWithProduct.transaction;
  const product = transactionWithProduct.product;

  return (
    <div className="space-y-6">
      {/* Read-only fields */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Product</span>
            <span className="font-medium">{product?.name || "Unknown"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Source</span>
            <Badge variant="outline">{transaction.source}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Editable form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditTransactionForm transaction={transaction} />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteTransactionDialog id={id} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server and:
1. Navigate to `/dashboard/transactions/<valid-id>` — verify styled cards with read-only info, edit form, and danger zone
2. Verify the skeleton loading state appears briefly before content loads
3. Navigate to `/dashboard/transactions/nonexistent-id` — verify EmptyState "not found" message appears

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.transactions.\$id.tsx
git commit -m "feat(transactions): redesign transaction detail with PageHeader, skeleton, and EmptyState errors"
```
