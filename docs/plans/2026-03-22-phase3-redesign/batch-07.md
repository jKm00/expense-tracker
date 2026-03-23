# Batch 7: Recurring Redesign

> **Plan:** Phase 3: Full Redesign
> **Goal:** Complete visual overhaul — dark-mode-first theme, responsive layouts, skeleton loaders, standardized error handling, and consistent shadcn component usage.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 26: Create `recurring-list-item.tsx` Component

**Depends on:** Task 1 (needs Card component)
**Can parallelize with:** Task 27 (but 27 depends on 26), Task 28

**Files:**
- Create: `src/features/recurring/components/recurring-list-item.tsx`

**Context:** A card-style row for displaying a single recurring item. Shows product name (bold), interval as a badge (e.g., "Monthly"), price, and an active/inactive indicator dot. The entire card is wrapped in a `<Link>` making it tappable/clickable to navigate to the recurring detail page.

The `RecurringWithProduct` type (from `recurring.models.ts`) has:
- `id` — the recurring product ID (used for routing)
- `product.name` — the product name to display
- `price` — numeric string (stored as `numeric(10,2)` in DB)
- `interval` — one of `"weekly" | "monthly" | "yearly"`
- `isActive` — boolean

**Step 1: Create the component**

Create `src/features/recurring/components/recurring-list-item.tsx`:

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
        <CardContent className="flex items-center justify-between py-3">
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

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/features/recurring/components/recurring-list-item.tsx
git commit -m "feat(recurring): add RecurringListItem card component"
```

---

## Task 27: Create `recurring-list.tsx` Component

**Depends on:** Tasks 6 (EmptyState), 26 (RecurringListItem)
**Can parallelize with:** Task 28

**Files:**
- Create: `src/features/recurring/components/recurring-list.tsx`

**Context:** Extracted recurring list component that receives an array of `RecurringWithProduct` items and renders `RecurringListItem` cards. Shows an empty state when there are no recurring items.

**Step 1: Create the component**

Create `src/features/recurring/components/recurring-list.tsx`:

```tsx
import { EmptyState } from "@/components/custom/empty-state";
import { RecurringListItem } from "./recurring-list-item";
import { RepeatIcon } from "lucide-react";
import type { RecurringWithProduct } from "../recurring.models";

export function RecurringList({
  items,
}: {
  items: RecurringWithProduct[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        message="No recurring transactions found."
        icon={RepeatIcon}
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <RecurringListItem key={item.id} recurring={item} />
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
git add src/features/recurring/components/recurring-list.tsx
git commit -m "feat(recurring): add RecurringList component with empty state"
```

---

## Task 28: Create `add-recurring.form.tsx` Component

**Depends on:** Task 7 (FormField)
**Can parallelize with:** Tasks 26, 27

**Files:**
- Modify: `src/features/recurring/recurring.validators.ts` (add `addFormValidation` schema)
- Create: `src/features/recurring/components/add-recurring.form.tsx`

**Context:** This replaces the raw `useState` form currently inline in `_app.dashboard.recurring.new.tsx`. The current form uses 5 separate `useState` hooks and manual validation. The rewrite uses TanStack Form with Zod `onBlur` validation, shadcn components, `FormField` wrappers, `FieldError` for inline errors, and `LoaderButton` for the submit button.

The canonical reference for TanStack Form patterns is `src/features/recurring/components/edit-recurring.form.tsx`. The add form is very similar but:
- Uses `addFormValidation` (no `isActive` field — new recurring items are always active)
- Default values are empty (no existing data to populate)
- On success, navigates to `/dashboard/recurring`
- Uses `toast.error()` for server errors

**Form fields:**
- `productId` (Combobox — search/select from existing products) — required
- `price` (text input, validated as number) — required
- `interval` (Select dropdown: weekly/monthly/yearly) — required
- `startDate` (Calendar popover) — required
- `endDate` (Calendar popover) — optional

The existing `recurring.validators.ts` has `formValidation` which includes `isActive`. For the add form, we need a separate schema without `isActive` and with `endDate` as optional (not nullable).

### Part A: Add `addFormValidation` to `recurring.validators.ts`

**Step 1: Add tests for the new validator**

Check if `src/features/recurring/recurring.validators.test.ts` exists. If it does, add the new test suite. If not, create it.

Add these tests:

```ts
import { describe, it, expect } from "vitest";
import { recurringValidators } from "./recurring.validators";

describe("recurringValidators.addFormValidation", () => {
  const schema = recurringValidators.addFormValidation;

  it("accepts valid add recurring data", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "42.50",
      interval: "monthly",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(true);
  });

  it("accepts data with optional endDate", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "weekly",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing productId", () => {
    const result = schema.safeParse({
      price: "10",
      interval: "monthly",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric price", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "abc",
      interval: "monthly",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid interval", () => {
    const result = schema.safeParse({
      productId: "some-uuid",
      price: "10",
      interval: "daily",
      startDate: new Date("2026-01-01"),
    });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/recurring/recurring.validators.test.ts`
Expected: FAIL — `recurringValidators.addFormValidation` is undefined

**Step 3: Add the new validator to the existing file**

Add the `addFormValidation` schema to `src/features/recurring/recurring.validators.ts`. Do NOT replace the existing `formValidation` schema — add `addFormValidation` above it and include it in the exports.

The existing file has:

```ts
import { numberInputValidator } from "@/validators";
import z from "zod";

const formValidation = z.object({
  productId: z.string(),
  price: numberInputValidator,
  interval: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.date(),
  endDate: z.date().nullable(),
  isActive: z.boolean(),
});

export const recurringValidators = {
  formValidation,
};
```

Add the `addFormValidation` schema and update the export. The file should become:

```ts
import { numberInputValidator } from "@/validators";
import z from "zod";

const addFormValidation = z.object({
  productId: z.string().min(1, "Product is required"),
  price: numberInputValidator,
  interval: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.date(),
  endDate: z.date().optional(),
});

const formValidation = z.object({
  productId: z.string(),
  price: numberInputValidator,
  interval: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.date(),
  endDate: z.date().nullable(),
  isActive: z.boolean(),
});

export const recurringValidators = {
  addFormValidation,
  formValidation,
};
```

**Key differences from `formValidation`:**
- `productId` has `.min(1, ...)` validation (add form starts empty, edit form has a pre-selected product)
- `endDate` is `.optional()` instead of `.nullable()` (add form uses `undefined` for "no end date", edit form uses `null`)
- No `isActive` field (new recurring items are always active)

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/recurring/recurring.validators.test.ts`
Expected: All tests PASS

**Step 5: Commit validators**

```bash
git add src/features/recurring/recurring.validators.ts src/features/recurring/recurring.validators.test.ts
git commit -m "feat(recurring): add addFormValidation Zod schema for add-recurring form"
```

### Part B: Create the form component

**Step 6: Create the add-recurring form**

Create `src/features/recurring/components/add-recurring.form.tsx`:

```tsx
import { useForm } from "@tanstack/react-form-start";
import { recurringValidators } from "../recurring.validators";
import { recurringMutations } from "../recurring.mutations";
import { productQueries } from "@/features/products/product.queries";
import { ProductWithTags } from "@/features/products/product.models";
import { RecurringInterval } from "../recurring.models";
import { getErrorMessage } from "@/utils/error-messages";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ChevronDownIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import FieldError from "@/components/custom/field-error";
import { FormField } from "@/components/custom/form-field";
import { LoaderButton } from "@/components/custom/loader.button";

export function AddRecurringForm() {
  const navigate = useNavigate();
  const mutation = recurringMutations.addRecurringProduct();

  const form = useForm({
    defaultValues: {
      productId: "",
      price: "",
      interval: "" as string,
      startDate: undefined as Date | undefined,
      endDate: undefined as Date | undefined,
    },
    validators: {
      onBlur: recurringValidators.addFormValidation,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          productId: value.productId,
          price: Number(value.price),
          interval: value.interval as RecurringInterval,
          startDate: value.startDate!,
          endDate: value.endDate,
        },
        {
          onSuccess: (data) => {
            const [err] = data;
            if (err) {
              toast.error(getErrorMessage(err));
              return;
            }
            navigate({ to: "/dashboard/recurring" });
          },
          onError: (error) => {
            toast.error(error.message);
          },
        },
      );
    },
  });

  const { data, isLoading } = useQuery(productQueries.getProductsOptions());
  const [_, res] = data ?? [null, null];
  const products = res ?? [];

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithTags | null>(null);

  useEffect(() => {
    if (selectedProduct) {
      form.setFieldValue("productId", selectedProduct.id);
    }
  }, [selectedProduct, form]);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading products...</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="productId"
        children={(field) => (
          <FormField label="Product">
            <Combobox
              items={products}
              itemToStringValue={(p: (typeof products)[number]) => p.id}
              itemToStringLabel={(p: (typeof products)[number]) => p.name}
              value={selectedProduct}
              onValueChange={(v) => setSelectedProduct(v)}
            >
              <ComboboxInput placeholder="Search product..." />
              <ComboboxContent>
                <ComboboxEmpty>No products found.</ComboboxEmpty>
                <ComboboxList>
                  {(p: ProductWithTags) => (
                    <ComboboxItem key={p.id} value={p}>
                      {p.name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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
      <form.Field
        name="interval"
        children={(field) => (
          <FormField label="Interval">
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Interval</SelectLabel>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError field={field} />
          </FormField>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <form.Field
          name="startDate"
          children={(field) => (
            <FormField label="Start Date">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!field.state.value}
                      className="grow justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {field.state.value ? (
                        format(field.state.value, "PPP")
                      ) : (
                        <span>Pick start date</span>
                      )}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.state.value}
                      onSelect={(v) => field.handleChange(v ?? undefined)}
                      defaultMonth={field.state.value}
                    />
                  </PopoverContent>
                </Popover>
                {field.state.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => field.handleChange(undefined)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <FieldError field={field} />
            </FormField>
          )}
        />
        <form.Field
          name="endDate"
          children={(field) => (
            <FormField label="End Date (optional)">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!field.state.value}
                      className="grow justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {field.state.value ? (
                        format(field.state.value, "PPP")
                      ) : (
                        <span>Pick end date</span>
                      )}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.state.value}
                      onSelect={(v) => field.handleChange(v ?? undefined)}
                      defaultMonth={field.state.value}
                    />
                  </PopoverContent>
                </Popover>
                {field.state.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => field.handleChange(undefined)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <FieldError field={field} />
            </FormField>
          )}
        />
      </div>
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit]) => (
          <LoaderButton
            type="submit"
            className="w-full"
            disabled={!canSubmit || mutation.isPending}
            isLoading={mutation.isPending}
          >
            Create Recurring
          </LoaderButton>
        )}
      />
    </form>
  );
}
```

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 8: Commit**

```bash
git add src/features/recurring/components/add-recurring.form.tsx
git commit -m "feat(recurring): add AddRecurringForm component with TanStack Form + Zod validation"
```

---

## Task 29: Rewrite `_app.dashboard.recurring.index.tsx`

**Depends on:** Tasks 5 (PageHeader), 8 (SkeletonList), 27 (RecurringList)
**Can parallelize with:** Tasks 30, 31

**Files:**
- Modify: `src/routes/_app.dashboard.recurring.index.tsx` (complete rewrite)

**Context:** The current recurring index renders raw `<Button>` elements per recurring item with no loading states and a bare `<h2>` header. The rewrite adds a `PageHeader` with a "Create" action button, uses `SkeletonList` for loading states, and renders the extracted `RecurringList` component.

The existing `recurringQueries.getRecurringProductsOptions()` returns `[error, RecurringWithProduct[]]`. The error type has `reason: "FETCH_RECURRING_ERROR"`.

**Step 1: Rewrite the recurring index route**

Replace the entire content of `src/routes/_app.dashboard.recurring.index.tsx` with:

```tsx
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { RecurringList } from "@/features/recurring/components/recurring-list";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeleton-list";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { PlusIcon, AlertTriangleIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/recurring/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringProductsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring"
        action={
          <Button asChild size="sm">
            <Link to="/dashboard/recurring/new">
              <PlusIcon className="size-4 mr-2" />
              Create
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<SkeletonList rows={5} />}>
        <RecurringListSection />
      </Suspense>
    </div>
  );
}

function RecurringListSection() {
  const { data, error } = useSuspenseQuery(
    recurringQueries.getRecurringProductsOptions(),
  );

  if (error) {
    return (
      <EmptyState
        message="Failed to load recurring transactions."
        icon={AlertTriangleIcon}
      />
    );
  }

  const [err, recurring] = data;

  if (err) {
    const reason = err.reason;
    switch (reason) {
      case "FETCH_RECURRING_ERROR":
        return (
          <EmptyState
            message="Failed to load recurring transactions. Please try again."
            icon={AlertTriangleIcon}
          />
        );
      default:
        return (
          <EmptyState
            message="Something went wrong."
            icon={AlertTriangleIcon}
          />
        );
    }
  }

  return <RecurringList items={recurring} />;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server and:
1. Navigate to `/dashboard/recurring` — verify PageHeader with "Create" button
2. Verify card-style recurring list items with interval badges and active indicators
3. Click "Create" — verify navigation to `/dashboard/recurring/new`
4. Click a recurring item — verify navigation to its detail page

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.recurring.index.tsx
git commit -m "feat(recurring): redesign recurring list with PageHeader, skeleton, and card items"
```

---

## Task 30: Rewrite `_app.dashboard.recurring.$id.tsx`

**Depends on:** Tasks 5 (PageHeader), 6 (EmptyState), 7 (FormField), 8 (SkeletonForm), 13 (getErrorMessage)
**Can parallelize with:** Tasks 29, 31

**Files:**
- Modify: `src/routes/_app.dashboard.recurring.$id.tsx` (rewrite with skeleton + PageHeader + EmptyState + Card wrappers)

**Context:** The current recurring detail page has raw `<div>` layout with no loading states and a bare `<p>` for errors. The rewrite adds `SkeletonForm` loading fallback, `PageHeader`, uses `EmptyState` for error states, and wraps sections in `Card` components. The existing `EditRecurringForm` and `DeleteRecurringProductDialog` are kept — just wrapped in better layout.

The `getRecurringProductOptions` query returns `[error, RecurringWithProduct]`. The error has `reason: "RECURRING_PRODUCT_NOT_FOUND" | "RECURRING_PRODUCT_FORBIDDEN"`.

**Step 1: Rewrite the recurring detail route**

Replace the entire content of `src/routes/_app.dashboard.recurring.$id.tsx` with:

```tsx
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { EditRecurringForm } from "@/features/recurring/components/edit-recurring.form";
import { DeleteRecurringProductDialog } from "@/features/recurring/components/delete-recurring.alert";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeleton-form";
import { EmptyState } from "@/components/custom/empty-state";
import { getErrorMessage } from "@/utils/error-messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AlertTriangleIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/recurring/$id")({
  loader: async ({ context, params }) => {
    const id = params.id;
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringProductOptions(id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Recurring Details" />
      <Suspense fallback={<SkeletonForm fields={6} />}>
        <RecurringProduct />
      </Suspense>
    </div>
  );
}

function RecurringProduct() {
  const { id } = Route.useParams();

  const { data } = useSuspenseQuery(
    recurringQueries.getRecurringProductOptions(id),
  );
  const [err, recurring] = data;

  if (err) {
    return (
      <EmptyState
        message={getErrorMessage(err)}
        icon={AlertTriangleIcon}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit Recurring Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Recurring</CardTitle>
        </CardHeader>
        <CardContent>
          <EditRecurringForm recurring={recurring} />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteRecurringProductDialog id={id} />
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
1. Navigate to a recurring detail page — verify cards for edit form and danger zone
2. Verify the edit form loads with existing data
3. Verify error states render EmptyState component

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.recurring.\$id.tsx
git commit -m "feat(recurring): redesign recurring detail with PageHeader, skeleton, EmptyState, and Card layout"
```

---

## Task 31: Rewrite `_app.dashboard.recurring.new.tsx`

**Depends on:** Tasks 5 (PageHeader), 8 (SkeletonForm), 28 (AddRecurringForm)
**Can parallelize with:** Tasks 29, 30

**Files:**
- Modify: `src/routes/_app.dashboard.recurring.new.tsx` (complete rewrite — remove all inline form code, use extracted component)

**Context:** The current file contains ~180 lines of inline form code with 5 `useState` hooks and manual validation. The rewrite replaces ALL of this with the extracted `AddRecurringForm` component (created in Task 28), wrapped in `PageHeader` and `Card`. The route component becomes very small — just layout.

**Step 1: Rewrite the recurring new route**

Replace the entire content of `src/routes/_app.dashboard.recurring.new.tsx` with:

```tsx
import { AddRecurringForm } from "@/features/recurring/components/add-recurring.form";
import { PageHeader } from "@/components/custom/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/recurring/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Recurring" />
      <Card>
        <CardHeader>
          <CardTitle>Create Recurring Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <AddRecurringForm />
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
1. Navigate to `/dashboard/recurring/new` — verify PageHeader and Card-wrapped form
2. Verify the Combobox loads products
3. Fill in all fields and submit — verify navigation to `/dashboard/recurring`
4. Verify Zod validation fires on blur (e.g., leave price empty and tab away)

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.recurring.new.tsx
git commit -m "feat(recurring): redesign recurring new page with extracted AddRecurringForm and Card layout"
```
