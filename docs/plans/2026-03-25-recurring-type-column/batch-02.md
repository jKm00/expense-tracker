# Batch 2: UI Components — Add Form, Edit Form, List Item

> **Plan:** Add `type` column to recurring product
> **Goal:** Add an `income` | `expense` type column to the `recurring_product` table, reusing the existing `transaction_type` pgEnum, and surface it in the UI forms and list view.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 5: Add Recurring Form — Type Select Field

**Depends on:** Task 3 (validators), Task 4 (controller)
**Can parallelize with:** Task 6, Task 7

**Files:**

- Modify: `src/features/recurring/components/add-recurring.form.tsx`

### Step 1: Add `type` to form defaultValues

In `src/features/recurring/components/add-recurring.form.tsx`, add `type` to the `defaultValues` object in the `useForm` call.

**Current defaultValues (lines 48–54):**

```ts
    defaultValues: {
      productId: "",
      price: "",
      interval: "" as string,
      startDate: undefined as Date | undefined,
      endDate: undefined as Date | undefined,
    },
```

**Updated defaultValues:**

```ts
    defaultValues: {
      productId: "",
      price: "",
      interval: "" as string,
      type: "expense" as string,
      startDate: undefined as Date | undefined,
      endDate: undefined as Date | undefined,
    },
```

> **Design decision:** Default to `"expense"` since most recurring items are expenses. The user can change to "income" if needed. This aligns with the DB default and reduces form errors.

### Step 2: Add `type` to the `onSubmit` mutation call

**Current onSubmit mutation.mutate call (lines 60–67):**

```ts
      mutation.mutate(
        {
          productId: value.productId,
          price: Number(value.price),
          interval: value.interval as RecurringInterval,
          startDate: value.startDate!,
          endDate: value.endDate,
        },
```

**Updated — add `type` cast and import `RecurringType`:**

First, update the import at the top of the file. Change:

```ts
import { RecurringInterval } from "../recurring.models";
```

to:

```ts
import { RecurringInterval, RecurringType } from "../recurring.models";
```

Then update the mutation call:

```ts
      mutation.mutate(
        {
          productId: value.productId,
          price: Number(value.price),
          interval: value.interval as RecurringInterval,
          type: value.type as RecurringType,
          startDate: value.startDate!,
          endDate: value.endDate,
        },
```

### Step 3: Add the Type select field to the JSX

Add a new `form.Field` block for `type` **after** the interval field (after line 176's closing `/>`) and **before** the date grid (line 177's `<div className="grid grid-cols-2 gap-4">`).

**New JSX block to insert:**

```tsx
      <form.Field
        name="type"
        children={(field) => (
          <FormField label="Type">
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
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
          </FormField>
        )}
      />
```

> **Note:** The `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectTrigger`, `SelectValue` components are already imported in this file. The `FormField` and `FieldError` components are also already imported. No new imports needed for the JSX.

### Step 4: Verify the form renders

Run:

```bash
npm run dev
```

Navigate to the add recurring form page and verify:
- A "Type" select dropdown appears between the interval and date fields
- It has "Expense" and "Income" options
- Form validation rejects submission when type is not selected

### Step 5: Commit

```bash
git add src/features/recurring/components/add-recurring.form.tsx
git commit -m "feat(recurring): add type select to add recurring form"
```

---

## Task 6: Edit Recurring Form — Type Select Field

**Depends on:** Task 3 (validators), Task 4 (controller)
**Can parallelize with:** Task 5, Task 7

**Files:**

- Modify: `src/features/recurring/components/edit-recurring.form.tsx`

### Step 1: Add `type` to form defaultValues

In `src/features/recurring/components/edit-recurring.form.tsx`, add `type` to the `defaultValues` object.

**Current defaultValues (lines 47–54):**

```ts
    defaultValues: {
      productId: recurring.productId,
      price: recurring.price,
      interval: recurring.interval,
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      isActive: recurring.isActive,
    },
```

**Updated defaultValues:**

```ts
    defaultValues: {
      productId: recurring.productId,
      price: recurring.price,
      interval: recurring.interval,
      type: recurring.type,
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      isActive: recurring.isActive,
    },
```

### Step 2: Add `type` to the `onSubmit` mutation call

**Current onSubmit mutation.mutate call (lines 59–65):**

```ts
      mutation.mutate(
        {
          ...value,
          interval: value.interval as RecurringInterval,
          price: Number(value.price),
          id: recurring.id,
        },
```

The spread `...value` already includes `type` since it's in `defaultValues`. However, we need to add the type cast to satisfy the DTO. Update the import and the mutation call:

First, update the import at the top of the file. Change:

```ts
import { RecurringInterval, RecurringWithProduct } from "../recurring.models";
```

to:

```ts
import { RecurringInterval, RecurringType, RecurringWithProduct } from "../recurring.models";
```

Then update the mutation call:

```ts
      mutation.mutate(
        {
          ...value,
          interval: value.interval as RecurringInterval,
          type: value.type as RecurringType,
          price: Number(value.price),
          id: recurring.id,
        },
```

### Step 3: Add the Type select field to the JSX

Add a new `form.Field` block for `type` **after** the interval field (after line 178's closing `/>`) and **before** the startDate field (line 179's `<form.Field name="startDate"`).

**New JSX block to insert:**

```tsx
      <form.Field
        name="type"
        children={(field) => (
          <>
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
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
```

> **Note:** The `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectTrigger`, `SelectValue` components are already imported in this file. No new imports needed for the JSX.

### Step 4: Verify the form renders

Run:

```bash
npm run dev
```

Navigate to an existing recurring product's edit page and verify:
- A "Type" select dropdown appears between the interval and start date fields
- It is pre-populated with the existing recurring product's type (should be "expense" for existing rows)
- Changing the type and submitting updates the value

### Step 5: Commit

```bash
git add src/features/recurring/components/edit-recurring.form.tsx
git commit -m "feat(recurring): add type select to edit recurring form"
```

---

## Task 7: Recurring List Item — Type Badge

**Depends on:** Task 1 (schema — `RecurringWithProduct` type must include `type` field)
**Can parallelize with:** Task 5, Task 6

**Files:**

- Modify: `src/features/recurring/components/recurring-list-item.tsx`

### Step 1: Update the list item to show type with color coding

In `src/features/recurring/components/recurring-list-item.tsx`, make two changes:
1. Add a type badge after the interval badge
2. Color the price green for income, red for expense

**Current file (full):**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import type { RecurringWithProduct } from "../recurring.models";

export function RecurringListItem({
  recurring,
}: {
  recurring: RecurringWithProduct;
}) {
  return (
    <Link
      to="/dashboard/recurring/$id"
      params={{ id: recurring.id }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`size-2 rounded-full shrink-0 ${
                recurring.isActive ? "bg-green-500" : "bg-muted-foreground"
              }`}
              title={recurring.isActive ? "Active" : "Inactive"}
            />
            <p className="font-medium truncate">{recurring.product.name}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <Badge variant="secondary" className="text-xs capitalize">
              {recurring.interval}
            </Badge>
            <p className="font-semibold text-red-500">
              {Number(recurring.price).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

**Updated file (full):**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import type { RecurringWithProduct } from "../recurring.models";

export function RecurringListItem({
  recurring,
}: {
  recurring: RecurringWithProduct;
}) {
  const isIncome = recurring.type === "income";

  return (
    <Link
      to="/dashboard/recurring/$id"
      params={{ id: recurring.id }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`size-2 rounded-full shrink-0 ${
                recurring.isActive ? "bg-green-500" : "bg-muted-foreground"
              }`}
              title={recurring.isActive ? "Active" : "Inactive"}
            />
            <p className="font-medium truncate">{recurring.product.name}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <Badge variant="secondary" className="text-xs capitalize">
              {recurring.interval}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${
                isIncome
                  ? "border-green-500/30 text-green-600 dark:text-green-400"
                  : "border-red-500/30 text-red-600 dark:text-red-400"
              }`}
            >
              {recurring.type}
            </Badge>
            <p
              className={`font-semibold ${
                isIncome ? "text-green-500" : "text-red-500"
              }`}
            >
              {isIncome ? "+" : "-"}
              {Number(recurring.price).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

**Changes explained:**
- Added `const isIncome = recurring.type === "income"` variable
- Added a new `Badge` with `variant="outline"` that shows "income" or "expense" — green-tinted border/text for income, red-tinted for expense
- Changed the price `<p>` from hardcoded `text-red-500` to dynamic: green for income, red for expense
- Added `+` / `-` prefix to the price

### Step 2: Verify in browser

Run:

```bash
npm run dev
```

Navigate to the recurring list and verify:
- Each item shows a type badge (should show "expense" for all existing items)
- The badge is red-tinted for expense items
- The price shows a `-` prefix and red color for expense items

### Step 3: Commit

```bash
git add src/features/recurring/components/recurring-list-item.tsx
git commit -m "feat(recurring): show type badge and color-coded price in list item"
```
