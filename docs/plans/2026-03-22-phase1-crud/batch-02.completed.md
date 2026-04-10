# Batch 2: Transaction Client Layer + UI

> **Plan:** Phase 1: CRUD Operations
> **Goal:** Add missing update/delete operations for transactions and create/update/delete operations for products.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 4: Transaction validators + queries + mutations

**Depends on:** Task 3
**Can parallelize with:** Tasks 8, 9, 10

**Files:**
- Create: `src/features/transactions/transaction.validators.ts`
- Create: `src/features/transactions/transaction.validators.test.ts`
- Modify: `src/features/transactions/transaction.queries.ts`
- Modify: `src/features/transactions/transaction.mutations.ts`

**Context:** Create the client-side Zod validator for the edit transaction form (following `recurring.validators.ts`), add a single-transaction query option (following `recurring.queries.ts`), and add update/delete mutation hooks (following `recurring.mutations.ts`).

**Step 1: Write validator tests**

Create `src/features/transactions/transaction.validators.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { transactionValidators } from "./transaction.validators";

describe("transactionValidators.editFormValidation", () => {
  const schema = transactionValidators.editFormValidation;

  it("accepts valid edit data", () => {
    const result = schema.safeParse({
      price: "42.50",
      type: "expense",
      date: "2026-01-15",
      description: "Groceries",
    });
    expect(result.success).toBe(true);
  });

  it("accepts edit data without description", () => {
    const result = schema.safeParse({
      price: "10",
      type: "income",
      date: "2026-03-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric price", () => {
    const result = schema.safeParse({
      price: "abc",
      type: "expense",
      date: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty price", () => {
    const result = schema.safeParse({
      price: "",
      type: "expense",
      date: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = schema.safeParse({
      price: "10",
      type: "refund",
      date: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = schema.safeParse({
      price: "10",
      type: "expense",
      date: "Jan 15, 2026",
    });
    expect(result.success).toBe(false);
  });

  it("accepts negative price (for adjustments)", () => {
    const result = schema.safeParse({
      price: "-5.00",
      type: "expense",
      date: "2026-01-15",
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/transactions/transaction.validators.test.ts`
Expected: FAIL — Cannot find module `./transaction.validators`

**Step 3: Create the validators file**

Create `src/features/transactions/transaction.validators.ts`:

```ts
import { numberInputValidator } from "@/validators";
import z from "zod";

const editFormValidation = z.object({
  price: numberInputValidator,
  type: z.enum(["expense", "income"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)"),
  description: z.string().optional(),
});

export const transactionValidators = {
  editFormValidation,
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/transactions/transaction.validators.test.ts`
Expected: All 7 tests PASS

**Step 5: Add `getTransactionOptions` to queries**

Replace `src/features/transactions/transaction.queries.ts` with:

```ts
import { queryOptions } from "@tanstack/react-query";
import { transactionController } from "./transaction.controller";

export const QUERY_KEY = "transactions";

const getTransactionsOptions = queryOptions({
  queryKey: [QUERY_KEY],
  queryFn: async () => await transactionController.getTransactions(),
});

function getTransactionOptions(id: string) {
  return queryOptions({
    queryKey: [QUERY_KEY, id],
    queryFn: () =>
      transactionController.getTransaction({
        data: { id },
      }),
  });
}

export const transactionQueries = {
  getTransactionsOptions,
  getTransactionOptions,
};
```

**Step 6: Add update/delete mutation hooks**

Replace `src/features/transactions/transaction.mutations.ts` with:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateTransactionInput } from "./transaction.dtos";
import {
  transactionController,
  UpdateTransactionDTO,
} from "./transaction.controller";
import { QUERY_KEY } from "./transaction.queries";

function addTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransactionInput) =>
      await transactionController.addTransaction({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
    },
  });
}

function updateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTransactionDTO) =>
      transactionController.updateTransaction({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
    },
  });
}

function deleteTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string }) =>
      transactionController.deleteTransaction({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [QUERY_KEY],
      });
    },
  });
}

export const transactionMutations = {
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
```

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add src/features/transactions/transaction.validators.ts src/features/transactions/transaction.validators.test.ts src/features/transactions/transaction.queries.ts src/features/transactions/transaction.mutations.ts
git commit -m "feat(transactions): add validators, single-transaction query, update/delete mutations"
```

---

## Task 5: Edit transaction form component

**Depends on:** Task 4
**Can parallelize with:** Task 6, Tasks 8-11

**Files:**
- Create: `src/features/transactions/components/edit-transaction.form.tsx`

**Context:** Build the edit form following `edit-recurring.form.tsx` exactly. The form has four editable fields: price (text input, validates as number), type (Select: income/expense), date (Calendar date picker), and description (text input). Product name and source are displayed as read-only text above the form. Uses `useForm` from `@tanstack/react-form-start` with `onBlur` Zod validation.

**Step 1: Create the edit form component**

Create `src/features/transactions/components/edit-transaction.form.tsx`:

```tsx
import { Transaction } from "../transaction.models";
import { useForm } from "@tanstack/react-form-start";
import { transactionValidators } from "../transaction.validators";
import { transactionMutations } from "../transaction.mutations";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";

export function EditTransactionForm({
  transaction,
}: {
  transaction: Transaction;
}) {
  const mutation = transactionMutations.updateTransaction();

  const form = useForm({
    defaultValues: {
      price: transaction.price,
      type: transaction.type,
      date: transaction.date,
      description: transaction.description ?? "",
    },
    validators: {
      onBlur: transactionValidators.editFormValidation,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          id: transaction.id,
          price: Number(value.price),
          type: value.type,
          date: value.date,
          description: value.description || undefined,
        },
        {
          onSuccess: (data) => {
            const [err] = data;
            if (err) {
              toast.error(err.message ?? "Failed to update transaction");
            } else {
              toast.success("Transaction updated");
            }
          },
        },
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="price"
        children={(field) => (
          <>
            <label>Price</label>
            <Input
              name={field.name}
              type="text"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </>
        )}
      />
      <form.Field
        name="type"
        children={(field) => (
          <>
            <label>Type</label>
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v as "income" | "expense")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Type</SelectLabel>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError field={field} />
          </>
        )}
      />
      <form.Field
        name="date"
        children={(field) => (
          <>
            <label>Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!field.state.value}
                  className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {field.state.value ? (
                    format(new Date(field.state.value + "T00:00:00"), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    field.state.value
                      ? new Date(field.state.value + "T00:00:00")
                      : undefined
                  }
                  onSelect={(v) => {
                    if (v) {
                      // Format as YYYY-MM-DD string
                      const dateStr = v.toISOString().split("T")[0];
                      field.handleChange(dateStr);
                    }
                  }}
                  defaultMonth={
                    field.state.value
                      ? new Date(field.state.value + "T00:00:00")
                      : new Date()
                  }
                />
              </PopoverContent>
            </Popover>
            <FieldError field={field} />
          </>
        )}
      />
      <form.Field
        name="description"
        children={(field) => (
          <>
            <label>Description</label>
            <Input
              name={field.name}
              type="text"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Optional description..."
            />
            <FieldError field={field} />
          </>
        )}
      />
      <form.Subscribe
        selector={(state) => [
          state.canSubmit,
          state.isSubmitting,
          state.isDefaultValue,
        ]}
        children={([canSubmit, isSubmitting, isDefaultValue]) => (
          <LoaderButton
            type="submit"
            disabled={!canSubmit || isDefaultValue || mutation.isPending}
            isLoading={mutation.isPending}
          >
            {isSubmitting ? "..." : "Save Changes"}
          </LoaderButton>
        )}
      />
    </form>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/transactions/components/edit-transaction.form.tsx
git commit -m "feat(transactions): add edit transaction form component"
```

---

## Task 6: Delete transaction dialog component

**Depends on:** Task 4
**Can parallelize with:** Task 5, Tasks 8-11

**Files:**
- Create: `src/features/transactions/components/delete-transaction.alert.tsx`

**Context:** Follow the `delete-recurring.alert.tsx` pattern exactly. AlertDialog with a destructive button. On confirm, calls the delete mutation. On success, navigates to `/dashboard/transactions`. On error, shows a toast.

**Step 1: Create the delete dialog component**

Create `src/features/transactions/components/delete-transaction.alert.tsx`:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { transactionMutations } from "../transaction.mutations";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function DeleteTransactionDialog({ id }: { id: string }) {
  const navigate = useNavigate();
  const mutation = transactionMutations.deleteTransaction();

  function handleDelete() {
    mutation.mutate(
      { id },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            toast.error(err.message ?? "Failed to delete transaction");
          } else {
            toast.success("Transaction deleted");
            navigate({ to: "/dashboard/transactions" });
          }
        },
      },
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Transaction</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this transaction?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            transaction.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} variant="destructive">
            Delete Transaction
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/transactions/components/delete-transaction.alert.tsx
git commit -m "feat(transactions): add delete transaction alert dialog"
```

---

## Task 7: Transaction detail route + list links

**Depends on:** Tasks 5, 6
**Can parallelize with:** Tasks 8-11

**Files:**
- Create: `src/routes/_app.dashboard.transactions.$id.tsx`
- Modify: `src/routes/_app.dashboard.transactions.tsx`

**Context:** Create the transaction detail/edit page following the `_app.dashboard.recurring.$id.tsx` pattern. The route prefetches the single transaction query, renders the edit form with read-only product/source info, and a "Danger Zone" section with the delete dialog. Also update the transactions list so each row is a `<Link>` to its detail page.

**Step 1: Create the transaction detail route**

Create `src/routes/_app.dashboard.transactions.$id.tsx`:

```tsx
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { EditTransactionForm } from "@/features/transactions/components/edit-transaction.form";
import { DeleteTransactionDialog } from "@/features/transactions/components/delete-transaction.alert";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

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
    <Suspense fallback={<p>Loading...</p>}>
      <TransactionDetail />
    </Suspense>
  );
}

function TransactionDetail() {
  const { id } = Route.useParams();

  const { data } = useSuspenseQuery(
    transactionQueries.getTransactionOptions(id),
  );
  const [err, transaction] = data;

  if (err) {
    const reason = err.reason;
    switch (reason) {
      case "TRANSACTION_NOT_FOUND":
        return <p>Transaction not found</p>;
      case "TRANSACTION_FORBIDDEN":
        return <p>You do not have access to this transaction</p>;
      default:
        return <p>Something went wrong</p>;
    }
  }

  return (
    <div>
      <h2>Edit Transaction</h2>

      {/* Read-only fields */}
      <div>
        <p>
          <strong>Source:</strong> {transaction.source}
        </p>
      </div>

      {/* Editable form */}
      <EditTransactionForm transaction={transaction} />

      {/* Danger Zone */}
      <div>
        <h3>Danger Zone</h3>
        <DeleteTransactionDialog id={id} />
      </div>
    </div>
  );
}
```

**Step 2: Update transactions list with links**

Replace `src/routes/_app.dashboard.transactions.tsx` with:

```tsx
import { transactionQueries } from "@/features/transactions/transaction.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
    <Suspense fallback={<p>Loading...</p>}>
      <TransactionsList />
    </Suspense>
  );
}

function TransactionsList() {
  const result = useSuspenseQuery(transactionQueries.getTransactionsOptions);

  if (result.error) {
    return <p>{result.error.message}</p>;
  }

  const [err, data] = result.data;

  if (err) {
    return <p>{err.reason}</p>;
  }

  return (
    <div>
      <h2>Transactions</h2>
      <ul>
        {data.map((row) => (
          <li key={row.transaction.id}>
            <Link
              to="/dashboard/transactions/$id"
              params={{ id: row.transaction.id }}
              className={`block ${row.transaction.type === "income" ? "text-green-400" : "text-red-400"}`}
            >
              {row.product?.name} - {row.transaction.price} -{" "}
              {row.transaction.date}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Manual verification**

Start the dev server (`npm run dev`) and:
1. Navigate to `/dashboard/transactions` — verify each transaction is a clickable link
2. Click a transaction — verify it navigates to `/dashboard/transactions/<id>`
3. Verify the edit form loads with the correct pre-populated values
4. Change the price and submit — verify toast says "Transaction updated"
5. Click "Delete Transaction" — verify AlertDialog appears
6. Confirm delete — verify you're navigated back to `/dashboard/transactions` and the transaction is gone

**Step 5: Commit**

```bash
git add src/routes/_app.dashboard.transactions.\$id.tsx src/routes/_app.dashboard.transactions.tsx
git commit -m "feat(transactions): add transaction detail/edit route and link from list"
```
