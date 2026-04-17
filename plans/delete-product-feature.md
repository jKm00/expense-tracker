# Implementation Plan: Delete Product Feature

## 1. Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 19 + TanStack Router/Start + TanStack React Query |
| Backend | TanStack Start server functions (`createServerFn`) on Nitro |
| Database | PostgreSQL |
| ORM | Drizzle ORM v1 beta + drizzle-kit migrations |
| Auth | better-auth (Drizzle adapter) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) |
| Forms | React Hook Form + Zod |

## 2. Data Model Context

```
products (id, userId, name, createdAt, updatedAt)
    ├── productTags (productId → products.id ON DELETE CASCADE)
    ├── entries (productId → products.id ON DELETE CASCADE)  ← CRITICAL
    └── recurring (productId → products.id ON DELETE CASCADE)

entries (id, transactionId → transactions.id, productId → products.id, price, quantity, type)
    └── entryTags (entryId → entries.id ON DELETE CASCADE)

transactions (id, userId, store, description, source, totalPrice, date, ...)
    └── entries (transactionId → transactions.id ON DELETE CASCADE)
```

### Critical finding
`entries.productId` has **`onDelete: "cascade"`** — deleting a product today would silently destroy all entries referencing it, leaving orphaned transactions with incorrect `totalPrice` values. **This is dangerous and must be addressed.**

### Current state
- `productRepo.remove(id)` exists in `products.repo.ts` (hard delete) but is **unused** — no service, controller, mutation, or UI calls it.
- No soft-delete fields (`deletedAt`, `isActive`) exist on the products table.
- A `DeleteTransactionDialog` and `DeleteTagDialog` already exist as patterns to follow.

---

## 3. Options Analysis

### Option A: Hard Delete with Cascade

Delete the product row; the DB cascade deletes all entries (and their tags) + recurring items that reference it. Transactions themselves remain but lose their entries.

| | |
|---|---|
| **Pros** | Simple to implement (the cascade FK already exists). No schema changes needed. Clean removal of all related data. |
| **Cons** | **Destructive and irreversible.** Transactions lose entries silently — `totalPrice` becomes wrong. Historical financial data is destroyed. Users cannot undo. Terrible for an expense-tracking app where data integrity matters. |
| **Data integrity** | ❌ Broken — orphaned transactions with mismatched totals |
| **UX** | ❌ Confusing — transactions appear to have different amounts than their entries show |

**Verdict: Not recommended.** Unacceptable for a financial tracking application.

---

### Option B: Soft Delete / Archive

Add a `deletedAt` timestamp column to `products`. When "deleting", set `deletedAt = now()`. Filter out soft-deleted products in all product list queries. Keep them visible in historical transaction views (greyed out / with "(deleted)" label).

| | |
|---|---|
| **Pros** | **Data integrity fully preserved.** Historical transactions remain accurate. Reversible (can "restore" a product). Clean UX — product disappears from active lists but transactions remain correct. Follows accounting best practices. |
| **Cons** | Requires a schema migration (new column). Every product query must add a `WHERE deletedAt IS NULL` filter. Slightly more complex to implement. Need to handle edge case: what if user creates a new product with the same name as a soft-deleted one? |
| **Data integrity** | ✅ Perfect — nothing is actually deleted |
| **UX** | ✅ Clean — products disappear from lists; transactions show product name with a "(deleted)" indicator |

**Verdict: ⭐ Recommended.** Best fit for a financial app. Preserves all data, simple UX, reversible.

---

### Option C: Block Deletion if Referenced

Attempt to delete → check if any entries or recurring items reference the product → if yes, reject with a message listing which transactions use it.

| | |
|---|---|
| **Pros** | No schema changes needed. Data integrity guaranteed. Simple logic. |
| **Cons** | **Frustrating UX** — users can never remove products that have been used even once. Over time the product list becomes cluttered with old/unwanted products. User has no recourse other than first deleting all referencing transactions (destroying financial history). |
| **Data integrity** | ✅ Preserved (deletion blocked) |
| **UX** | ⚠️ Poor for long-term use — product list clutter grows over time |

**Verdict: Acceptable as a secondary safeguard, but not as the primary strategy.**

---

### Option D: Nullify References

Change `entries.productId` to nullable. On product delete, set `productId = NULL` on all referencing entries (change FK to `ON DELETE SET NULL`). Entries and transactions remain intact but lose their product link.

| | |
|---|---|
| **Pros** | Transactions/entries survive. Product is fully removed. |
| **Cons** | Requires schema migration (make column nullable, change FK action). Entries lose their product association — you can't tell what product an expense was for. Breaks reports/analytics that group by product. The entry `productId` being `NOT NULL` is currently a useful constraint. |
| **Data integrity** | ⚠️ Partial — entries exist but lose meaning |
| **UX** | ⚠️ Confusing — transaction entries show "Unknown product" |

**Verdict: Not recommended.** Losing the product-entry link defeats the purpose of tracking expenses by product.

---

## 4. Recommendation: Option B (Soft Delete / Archive)

For an expense tracking application, **data preservation is paramount**. Soft delete is the industry standard for financial data and the best balance of clean UX + data integrity.

---

## 5. Detailed Implementation Plan (Option B)

### Step 1: Database Migration — Add `deletedAt` column

**File:** New migration via `drizzle-kit`

- Add `deletedAt timestamp` (nullable, default `NULL`) to `products` table
- Products with `deletedAt = NULL` are active; non-null means soft-deleted

**Schema change in:** `src/features/products/products.schema.ts`
```ts
// Add to products table definition:
deletedAt: timestamp("deleted_at"),
```

**Run:** `pnpm drizzle-kit generate` then `pnpm drizzle-kit migrate`

---

### Step 2: Update Product Repo

**File:** `src/features/products/products.repo.ts`

- Modify `getAll()` — add `WHERE deleted_at IS NULL` filter
- Modify `getById()` — add `WHERE deleted_at IS NULL` filter (or keep it visible for transaction detail views)
- Add `softDelete(id: string)` method — `UPDATE products SET deleted_at = NOW() WHERE id = ?`
- Optionally add `restore(id: string)` method
- Keep existing `remove()` as-is (for potential admin use or future cleanup)

---

### Step 3: Add Product Service Method

**File:** `src/features/products/products.service.ts`

- Add `deleteProduct(productId: string, userId: string)` that:
  1. Fetches the product, verifies ownership (`userId` matches)
  2. Calls `productRepo.softDelete(productId)`
  3. Returns success result

---

### Step 4: Add Server Function (Controller)

**File:** `src/features/products/products.controller.ts`

- Add `deleteProduct` server function following existing patterns (e.g., `updateProduct`)
- Input: `{ productId: string }`
- Auth check via `getSession()`
- Call `productService.deleteProduct()`

---

### Step 5: Add Mutation Hook

**File:** `src/features/products/products.mutations.ts`

- Add `useDeleteProduct()` mutation hook following the pattern from `transactions.mutations.ts` → `deleteTransaction`
- On success: invalidate product queries, show success toast, navigate to `/dashboard/products`

---

### Step 6: Add Delete UI Component

**New file:** `src/features/products/components/delete-product.dialog.tsx`

- Follow the exact pattern of `DeleteTransactionDialog` (`delete-transaction.alert.tsx`)
- `AlertDialog` with:
  - Title: "Delete product?"
  - Description: "This product will be archived. It will no longer appear in product lists, but historical transactions will still reference it."
  - Cancel + Confirm buttons
  - Calls the `useDeleteProduct()` mutation on confirm

---

### Step 7: Wire Up Delete Button in Product Detail Page

**File:** `src/routes/_app/dashboard/products/$productId.tsx`

- Import and render `DeleteProductDialog`
- Add a delete button (red, bottom of page or in header) that opens the dialog

---

### Step 8: Handle Soft-Deleted Products in Transaction Views

**Files:**
- `src/features/transactions/transactions.repo.ts` — ensure product joins still include soft-deleted products (no `deletedAt` filter when loading transaction details)
- `src/features/transactions/components/entry-list.tsx` — if a product has `deletedAt`, show its name with a visual indicator (e.g., strikethrough or "(archived)" suffix, muted text color)

---

### Step 9: Update Product Types

**File:** `src/features/products/products.models.ts`

- The `Product` type will automatically include `deletedAt: Date | null` from the schema change
- No manual type changes needed (uses `InferSelectModel`)

---

### Step 10: Handle Edge Cases

- **New transaction form:** Product pickers/dropdowns should exclude soft-deleted products (filter `WHERE deleted_at IS NULL`)
- **Recurring items:** If a product is soft-deleted, the recurring item still exists. Consider showing a warning on the recurring items page, or auto-pausing recurring items for deleted products.
- **Duplicate names:** Allow creating a product with the same name as a soft-deleted one (they're different records).

---

### Files Changed Summary

| File | Change |
|---|---|
| `src/features/products/products.schema.ts` | Add `deletedAt` column |
| `src/features/products/products.repo.ts` | Add `softDelete()`, update queries to filter deleted |
| `src/features/products/products.service.ts` | Add `deleteProduct()` |
| `src/features/products/products.controller.ts` | Add `deleteProduct` server function |
| `src/features/products/products.mutations.ts` | Add `useDeleteProduct()` hook |
| `src/features/products/products.models.ts` | No change needed (auto-inferred) |
| `src/features/products/components/delete-product.dialog.tsx` | **New file** — confirmation dialog |
| `src/routes/_app/dashboard/products/$productId.tsx` | Add delete button + dialog |
| `src/features/transactions/components/entry-list.tsx` | Show "(archived)" for deleted products |
| `src/features/transactions/transactions.repo.ts` | Ensure product joins don't filter deleted products |
| New migration file | Add `deleted_at` column |

### Estimated Complexity
- **Migration:** Trivial (one column)
- **Backend (repo/service/controller):** Small — ~50-80 lines following existing patterns
- **Frontend (mutation + dialog + wiring):** Small — ~80-120 lines following existing `DeleteTransactionDialog` pattern
- **Edge case handling (transaction views, dropdowns):** Medium — requires auditing all product queries

