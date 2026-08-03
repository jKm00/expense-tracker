# Fix: Inline Product Creation in Recurring Transaction Form

## Problem

When creating a recurring transaction, the `ProductSelect` component allows users to type a new product name and click "Create '{name}'". This emits a `Product` object with `id: ""`. The current `handleProductSelect` in `new-recurring.form.tsx` silently ignores this case (early returns), so the form never gets a `productId` and submission fails validation.

The transaction form already solves this — it uses a `{ id: string | null, name: string }` pattern and a `resolveProduct` helper in the service layer. We replicate that pattern for recurring.

## Existing Pattern (transactions — use as reference)

- **`src/features/transactions/components/new-transaction.form.tsx:263-269`** — sets `product: { id: null, name }` when `id` is empty
- **`src/features/transactions/transactions.service.ts:287-298`** — `resolveProduct()` creates product if `id` is null, otherwise fetches existing

---

## Changes Required (4 files)

### 1. DTO — `src/features/recurring/recurring.dtos.ts:12-20`

Replace `productId: z.string()` with a product object that accepts either an existing ID or a new name.

```ts
// BEFORE
export const createRecurringSchema = z.object({
  productId: z.string(),
  price: positiveNumberValidator,
  interval: z.enum(recurringIntervals),
  type: z.enum(entryTypes),
  start: z.date(),
  end: z.date().optional(),
  isActive: z.boolean(),
});

// AFTER
export const createRecurringSchema = z.object({
  product: z.object({
    id: z.string().nullable(),
    name: z.string(),
  }),
  price: positiveNumberValidator,
  interval: z.enum(recurringIntervals),
  type: z.enum(entryTypes),
  start: z.date(),
  end: z.date().optional(),
  isActive: z.boolean(),
});
```

### 2. Service — `src/features/recurring/recurring.service.ts:51-81`

Add a `resolveProduct` helper (same as transactions) and use it in `createRecurring`.

```ts
// Add at top of file or bottom, before the export:
async function resolveProduct(
  userId: string,
  product: { id: string | null; name: string },
) {
  if (!product.id) {
    return await productService.addProduct({
      userId,
      name: product.name,
    });
  }
  return await productService.getProduct(userId, product.id);
}

// REPLACE createRecurring function:
async function createRecurring(
  userId: string,
  data: Omit<NewRecurring, "isActive" | "productId"> & {
    isActive: boolean;
    product: { id: string | null; name: string };
  },
) {
  const [productError, product] = await resolveProduct(userId, data.product);
  if (productError) {
    return err({
      reason: "RECURRING_UNAUTHORIZED" as const,
      message: `User ${userId} does not own product ${data.product.id ?? data.product.name}`,
    });
  }

  try {
    const res = await recurringRepo.save({
      productId: product.id,
      price: data.price,
      interval: data.interval,
      type: data.type,
      start: data.start,
      end: data.end,
      isActive: data.isActive,
    });
    if (res.length === 0) {
      return err({
        reason: "RECURRING_NOT_RETURNED" as const,
        message: "No recurring transaction returned after saving",
      });
    }
    return ok(res[0]);
  } catch (error) {
    return err({
      reason: "RECURRING_DB_ERROR" as const,
      message: "Failed to save recurring transaction",
    });
  }
}
```

### 3. Controller — `src/features/recurring/recurring.controller.ts:27-41`

Pass `product` instead of `productId`:

```ts
// BEFORE
return await recurringService.createRecurring(userId, {
  productId: data.productId,
  price: data.price,
  ...
});

// AFTER
return await recurringService.createRecurring(userId, {
  product: data.product,
  price: data.price,
  interval: data.interval,
  type: data.type,
  start: data.start,
  end: data.end,
  isActive: data.isActive,
});
```

### 4. Form — `src/features/recurring/components/new-recurring.form.tsx`

**a) Update `handleProductSelect` (line 101-107):**

```ts
// BEFORE
function handleProductSelect(product: Product) {
  if (product.id.length === 0) {
    return;
  }
  setValue("productId", product.id);
}

// AFTER
function handleProductSelect(product: Product) {
  if (product.id.length === 0) {
    setValue("product", { id: null, name: product.name });
  } else {
    setValue("product", { id: product.id, name: product.name });
  }
}
```

**b) Update form type and default values (line 60-68):**

The form type `CreateRecurringDTO` will automatically update since it's inferred from the schema. No explicit change needed here, but ensure `defaultValues` doesn't set `productId` (it currently doesn't, so no change).

**c) Update error field reference (line 118):**

```tsx
// BEFORE
<FormFieldError>{errors.productId?.message}</FormFieldError>

// AFTER
<FormFieldError>{errors.product?.id?.message ?? errors.product?.name?.message}</FormFieldError>
```

**d) Update error handler in `onSubmit` (line 76-92):**

No change needed — the error reasons from the service remain the same.

---

## Summary

| File | Change |
|------|--------|
| `src/features/recurring/recurring.dtos.ts` | `productId` → `product: { id: nullable, name }` |
| `src/features/recurring/recurring.service.ts` | Add `resolveProduct`, update `createRecurring` signature |
| `src/features/recurring/recurring.controller.ts` | Pass `data.product` instead of `data.productId` |
| `src/features/recurring/components/new-recurring.form.tsx` | Handle both cases in `handleProductSelect`, fix error display |

No changes needed to `ProductSelect` component — it already emits the right data.
