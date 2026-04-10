# Batch 4: Error Handling + Dashboard Redesign

> **Plan:** Phase 3: Full Redesign
> **Goal:** Complete visual overhaul — dark-mode-first theme, responsive layouts, skeleton loaders, standardized error handling, and consistent shadcn component usage.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 13: Create `error-messages.ts` Utility

**Depends on:** Nothing
**Can parallelize with:** Task 14

**Files:**
- Create: `src/utils/error-messages.ts`
- Create: `src/utils/error-messages.test.ts`

**Context:** Standardizes error message display across the app. Maps error `reason` strings (like `TRANSACTION_NOT_FOUND`, `PRODUCT_FORBIDDEN`) to user-friendly messages. Used in mutation `onSuccess` callbacks (with toast) and in query error displays (inline with `EmptyState`).

**Step 1: Write the test**

Create `src/utils/error-messages.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./error-messages";

describe("getErrorMessage", () => {
  it("maps NOT_FOUND reasons to 'not found' message", () => {
    expect(getErrorMessage({ reason: "TRANSACTION_NOT_FOUND" })).toBe(
      "Item not found. It may have been deleted.",
    );
    expect(getErrorMessage({ reason: "PRODUCT_NOT_FOUND" })).toBe(
      "Item not found. It may have been deleted.",
    );
    expect(getErrorMessage({ reason: "RECURRING_PRODUCT_NOT_FOUND" })).toBe(
      "Item not found. It may have been deleted.",
    );
  });

  it("maps FORBIDDEN reasons to 'no access' message", () => {
    expect(getErrorMessage({ reason: "TRANSACTION_FORBIDDEN" })).toBe(
      "You don't have access to this item.",
    );
    expect(getErrorMessage({ reason: "PRODUCT_FORBIDDEN" })).toBe(
      "You don't have access to this item.",
    );
    expect(getErrorMessage({ reason: "RECURRING_PRODUCT_FORBIDDEN" })).toBe(
      "You don't have access to this item.",
    );
  });

  it("returns generic message for unknown reasons", () => {
    expect(getErrorMessage({ reason: "UNKNOWN_ERROR" })).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("uses custom message if provided and reason is unknown", () => {
    expect(
      getErrorMessage({ reason: "SOME_ERROR", message: "Custom error" }),
    ).toBe("Something went wrong. Please try again.");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/error-messages.test.ts`
Expected: FAIL — Cannot find module `./error-messages`

**Step 3: Create the utility**

Create `src/utils/error-messages.ts`:

```ts
export function getErrorMessage(err: {
  reason: string;
  message?: string;
}): string {
  switch (err.reason) {
    case "TRANSACTION_NOT_FOUND":
    case "PRODUCT_NOT_FOUND":
    case "RECURRING_PRODUCT_NOT_FOUND":
      return "Item not found. It may have been deleted.";
    case "TRANSACTION_FORBIDDEN":
    case "PRODUCT_FORBIDDEN":
    case "RECURRING_PRODUCT_FORBIDDEN":
      return "You don't have access to this item.";
    default:
      return "Something went wrong. Please try again.";
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/error-messages.test.ts`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/utils/error-messages.ts src/utils/error-messages.test.ts
git commit -m "feat(utils): add getErrorMessage utility for standardized error display"
```

---

## Task 14: Add `addFormValidation` to `transaction.validators.ts`

**Depends on:** Nothing
**Can parallelize with:** Task 13

**Files:**
- Modify: `src/features/transactions/transaction.validators.ts`
- Modify: `src/features/transactions/transaction.validators.test.ts` (if it exists — add new tests)

**Context:** The add-transaction form currently in `_app.dashboard.index.tsx` uses manual `useState` validation. The rewrite uses TanStack Form with Zod `onBlur` validation. We need a new `addFormValidation` schema that validates `productName`, `description`, `price`, and `type`. The existing `editFormValidation` validates different fields (date instead of productName), so we need a separate schema.

**Step 1: Add tests for the new validator**

Check if `src/features/transactions/transaction.validators.test.ts` exists. If it does, add the new test suite to it. If not, create it.

Add these tests (either to the existing file or a new one):

```ts
import { describe, it, expect } from "vitest";
import { transactionValidators } from "./transaction.validators";

describe("transactionValidators.addFormValidation", () => {
  const schema = transactionValidators.addFormValidation;

  it("accepts valid add transaction data", () => {
    const result = schema.safeParse({
      productName: "Groceries",
      description: "Weekly shopping",
      price: "42.50",
      type: "expense",
    });
    expect(result.success).toBe(true);
  });

  it("accepts data without description", () => {
    const result = schema.safeParse({
      productName: "Coffee",
      price: "5",
      type: "income",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty product name", () => {
    const result = schema.safeParse({
      productName: "",
      price: "10",
      type: "expense",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric price", () => {
    const result = schema.safeParse({
      productName: "Coffee",
      price: "abc",
      type: "expense",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = schema.safeParse({
      productName: "Coffee",
      price: "5",
      type: "refund",
    });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/transactions/transaction.validators.test.ts`
Expected: FAIL — `transactionValidators.addFormValidation` is undefined

**Step 3: Add the new validator to `transaction.validators.ts`**

Modify `src/features/transactions/transaction.validators.ts` to add the `addFormValidation` schema:

```ts
import { numberInputValidator } from "@/validators";
import z from "zod";

const addFormValidation = z.object({
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: numberInputValidator,
  type: z.enum(["expense", "income"]),
});

const editFormValidation = z.object({
  price: numberInputValidator,
  type: z.enum(["expense", "income"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)"),
  description: z.string().optional(),
});

export const transactionValidators = {
  addFormValidation,
  editFormValidation,
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/transactions/transaction.validators.test.ts`
Expected: All tests PASS (both new and existing)

**Step 5: Commit**

```bash
git add src/features/transactions/transaction.validators.ts src/features/transactions/transaction.validators.test.ts
git commit -m "feat(transactions): add addFormValidation Zod schema for add-transaction form"
```

---

## Task 15: Create `add-transaction.form.tsx` Component

**Depends on:** Tasks 7 (FormField), 14 (addFormValidation)
**Can parallelize with:** Nothing

**Files:**
- Create: `src/features/transactions/components/add-transaction.form.tsx`

**Context:** This replaces the raw `<input>` + `useState` form currently in `_app.dashboard.index.tsx`. Uses TanStack Form with Zod `onBlur` validation, shadcn `Input` and `Select` components, `FormField` wrappers, `FieldError` for inline errors, and `LoaderButton` for the submit button. The form has two submit buttons: "Expense" and "Income" — which set the transaction type before submitting.

The form fields are:
- `productName` (text input) — required
- `description` (text input) — optional
- `price` (text input, validated as number) — required
- `type` (hidden, set by which button is clicked) — required

The `type` field is not shown as a visible input — instead, the two buttons at the bottom set it and submit in one action.

**Step 1: Create the form component**

Create `src/features/transactions/components/add-transaction.form.tsx`:

```tsx
import { useForm } from "@tanstack/react-form-start";
import { transactionValidators } from "../transaction.validators";
import { transactionMutations } from "../transaction.mutations";
import { getErrorMessage } from "@/utils/error-messages";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import { FormField } from "@/components/custom/form-field";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";

export function AddTransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const mutation = transactionMutations.addTransaction();

  const form = useForm({
    defaultValues: {
      productName: "",
      description: "",
      price: "",
      type: "expense" as "expense" | "income",
    },
    validators: {
      onBlur: transactionValidators.addFormValidation,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          productName: value.productName,
          description: value.description || undefined,
          price: Number(value.price),
          type: value.type,
          source: "manual",
        },
        {
          onSuccess: (data) => {
            const [err] = data;
            if (err) {
              toast.error(getErrorMessage(err));
              return;
            }
            form.reset();
            onSuccess?.();
          },
          onError: (error) => {
            toast.error(error.message);
          },
        },
      );
    },
  });

  function handleSubmitWithType(type: "expense" | "income") {
    form.setFieldValue("type", type);
    // Use setTimeout to ensure the field value is set before submission
    setTimeout(() => form.handleSubmit(), 0);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="space-y-4"
    >
      <form.Field
        name="productName"
        children={(field) => (
          <FormField label="Product">
            <Input
              name={field.name}
              type="text"
              placeholder="Product name..."
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </FormField>
        )}
      />
      <form.Field
        name="description"
        children={(field) => (
          <FormField label="Description">
            <Input
              name={field.name}
              type="text"
              placeholder="Optional description..."
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </FormField>
        )}
      />
      <form.Field
        name="price"
        children={(field) => (
          <FormField label="Price">
            <Input
              name={field.name}
              type="text"
              placeholder="0.00"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </FormField>
        )}
      />
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit]) => (
          <div className="flex gap-2">
            <LoaderButton
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={!canSubmit || mutation.isPending}
              isLoading={mutation.isPending && form.state.values.type === "expense"}
              onClick={() => handleSubmitWithType("expense")}
            >
              Expense
            </LoaderButton>
            <LoaderButton
              type="button"
              className="flex-1"
              disabled={!canSubmit || mutation.isPending}
              isLoading={mutation.isPending && form.state.values.type === "income"}
              onClick={() => handleSubmitWithType("income")}
            >
              Income
            </LoaderButton>
          </div>
        )}
      />
    </form>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/features/transactions/components/add-transaction.form.tsx
git commit -m "feat(transactions): add AddTransactionForm component with TanStack Form + Zod validation"
```

---

## Task 16: Rewrite `_app.dashboard.index.tsx` (Dashboard)

**Depends on:** Tasks 8 (skeletons), 13 (error utility), 15 (AddTransactionForm)
**Can parallelize with:** Nothing

**Files:**
- Modify: `src/routes/_app.dashboard.index.tsx` (complete rewrite)

**Context:** The current dashboard has only a raw form with `<input>` elements. The redesign adds: (1) balance summary cards at the top showing total income, total expenses, and net balance, (2) the redesigned `AddTransactionForm`, and (3) a recent transactions list (last 10) with a "View all" link. The balance data is computed from the existing `getTransactionsOptions` query — no new server function needed.

**Step 1: Rewrite the dashboard route**

Replace the entire content of `src/routes/_app.dashboard.index.tsx` with:

```tsx
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { AddTransactionForm } from "@/features/transactions/components/add-transaction.form";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonPage } from "@/components/custom/skeleton-page";
import { SkeletonCard } from "@/components/custom/skeleton-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/dashboard/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionsOptions,
    );
  },
  component: RouteComponent,
});

function DashboardSkeleton() {
  return (
    <SkeletonPage>
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </SkeletonPage>
  );
}

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

function DashboardContent() {
  const { data } = useSuspenseQuery(transactionQueries.getTransactionsOptions);
  const [err, transactions] = data;

  if (err) {
    return <p className="text-muted-foreground">Failed to load dashboard data.</p>;
  }

  // Calculate balance summary
  const totalIncome = transactions
    .filter((t) => t.transaction.type === "income")
    .reduce((sum, t) => sum + Number(t.transaction.price), 0);

  const totalExpenses = transactions
    .filter((t) => t.transaction.type === "expense")
    .reduce((sum, t) => sum + Number(t.transaction.price), 0);

  const netBalance = totalIncome - totalExpenses;

  // Recent transactions (last 10)
  const recentTransactions = transactions.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Balance summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              {totalIncome.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {totalExpenses.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {netBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add transaction form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTransactionForm />
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <Link
            to="/dashboard/transactions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((row) => (
              <Link
                key={row.transaction.id}
                to="/dashboard/transactions/$id"
                params={{ id: row.transaction.id }}
                className="block"
              >
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {row.product?.name ?? "Unknown"}
                      </p>
                      {row.transaction.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {row.transaction.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p
                        className={`font-semibold ${
                          row.transaction.type === "income"
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {row.transaction.type === "income" ? "+" : "-"}
                        {Number(row.transaction.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.transaction.date}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server (`npm run dev`) and:
1. Navigate to `/dashboard` — verify 3 summary cards appear at top (Income, Expenses, Net Balance)
2. Verify the add-transaction form has styled inputs with labels
3. Add a test transaction — verify form resets after success
4. Verify recent transactions list shows below the form with color-coded prices
5. Click "View all" — verify it navigates to `/dashboard/transactions`
6. Resize to mobile — verify cards stack vertically

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.index.tsx
git commit -m "feat(dashboard): redesign with balance cards, TanStack Form, and recent transactions"
```
