# Shopping List Feature Plan

## Goal

Add a persistent shopping list flow for grocery shopping that can be checked off while shopping, then converted into a new transaction with per-item pricing and quantity entry.

## Agreed Decisions

| Area                      | Decision                                                 | Implementation Note                                                                |
| ------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Feature surface           | Persistent shopping list with its own page/surface       | The list should survive reloads and be available outside the transaction form.     |
| Data persistence          | Database-backed per user                                 | Shopping list state must persist across sessions and devices.                      |
| List lifecycle            | One active checklist only                                | Each user has one current shopping list. No multi-list support in v1.              |
| Navigation                | Add shopping list to primary navigation                  | This is a core workflow, not a secondary feature. Profile moves under More.        |
| Routes                    | `/dashboard/shopping` and `/dashboard/shopping/checkout` | Separate pages for list management and completion.                                 |
| Item identity             | Reuse existing product picker with freeform creation     | Shopping items should use the same product search/create behavior as transactions. |
| Row data                  | Product + checked state only                             | No planned quantity or notes in v1.                                                |
| Duplicate items           | Merge duplicates automatically                           | Keep one row per product in the active list.                                       |
| Row order                 | Keep add order                                           | Checked items stay in place.                                                       |
| Checkoff interaction      | Row tap + checkbox                                       | Fast on mobile and visually clear.                                                 |
| Item editing on list page | Remove only                                              | If a user wants a different product, they remove it and add a new one.             |
| Add-item UI               | Inline add row at the top                                | Reuse the existing product selector inline; no dialog.                             |
| Save model                | Save immediately with optimistic updates                 | Toggle/add/remove actions should persist right away and feel snappy.               |
| Checkout surface          | Separate page/route                                      | Better for dense pricing entry than an inline panel.                               |
| Checkout layout           | Responsive dense layout                                  | Compact, one-glance when space allows, single-column on smaller screens.           |
| Checkout result           | Exactly one transaction                                  | One shopping trip becomes one transaction.                                         |
| Checkout rows             | Product prefilled, quantity defaults to 1                | Price and total start blank so users can use either side of the calculation.       |
| Checkout row editing      | Edit quantity/pricing only                               | Product stays fixed; change product by removing the row and adding a new one.      |
| Transaction meta          | Reuse store, description, and date                       | Keep the same documentation fields as the current new transaction form.            |
| Transaction source        | Add a distinct `shopping` source                         | Shopping-created transactions should be identifiable in analytics and history.     |
| Completion rule           | Require at least one checked item                        | Prevent completing an empty shopping session.                                      |
| Leftover unchecked items  | Ask at completion whether to keep or remove              | User chooses once before finalizing the transaction.                               |
| Post-checkout cleanup     | Clear the active list completely                         | No archive in v1; the created transaction is the durable record.                   |
| Future metadata           | Keep the model minimal                                   | Do not reserve fields for notes/tags unless they are needed later.                 |

## Implementation Plan

### 1. Data model and schema

- [x] Add shopping list tables/schema for a single active per-user list.
- [x] Add shopping item fields for product reference and checked state.
- [x] Add shopping transaction source value (`shopping`).
- [x] Add and run the database migration.

### 2. Server layer

- [x] Create shopping list repo/service/controller equivalents.
- [x] Add endpoints for loading the active list.
- [x] Add endpoints for add item, remove item, toggle checked state, and merge duplicates.
- [x] Add endpoint for checkout prefill data if needed.
- [x] Add endpoint for completing shopping and clearing/retaining leftovers.

### 3. Client data access

- [x] Add shopping queries.
- [x] Add shopping mutations with optimistic updates.
- [x] Invalidate the correct query keys after each mutation.

### 4. Shopping list page

- [x] Create `/dashboard/shopping` route.
- [x] Add the page to primary navigation and move Profile under More.
- [x] Build the active list view with checkbox + row tap behavior.
- [x] Render checked items clearly while keeping them visible.
- [x] Add the inline product search/create row at the top.
- [x] Support remove-only inline actions for v1.

### 5. Checkout page

- [x] Create `/dashboard/shopping/checkout` route.
- [x] Prefill one transaction row per checked shopping item.
- [x] Reuse the current unit-price/total-price calculation pattern.
- [x] Allow adding/removing items from the generated checkout form.
- [x] Keep generated products fixed and editable only for quantity/pricing.
- [x] Reuse store, description, and date fields from the current new transaction form.

### 6. Finalization flow

- [x] Block checkout when no items are checked.
- [x] Add the leftover-items choice: keep later or remove now.
- [x] Create one transaction on final submit using the `shopping` source.
- [x] Clear the active shopping list after success.
- [x] Navigate to the created transaction after completion.

### 7. UX polish and verification

- [x] Make the layout dense but mobile-friendly.
- [x] Verify optimistic updates behave correctly under slow network conditions.
- [x] Add tests for list toggling, merge behavior, checkout prefill, and leftover handling.
- [x] Verify the shopping source appears correctly in transaction history and analytics.

## Notes

- The existing transaction form already has the quantity + unit price + total price calculation pattern needed for checkout.
- The existing product selector already supports freeform creation, so the shopping list can reuse it directly.
- The feature should stay minimal in v1 and use the transaction as the canonical record after checkout.
