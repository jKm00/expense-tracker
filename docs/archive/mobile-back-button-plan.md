# Mobile Back Button for Detail/Sub-Pages

## Goal
Add a mobile-only back button to `PageHeader` on detail and sub-pages so the app feels more native on mobile. The button is hidden on `md:` and above.

---

## Step 1: Modify `PageHeader` component

**File:** `apps/web/src/components/custom/page-header.tsx`

Add a new `PageHeaderBackButton` compound component and update `PageHeader` to render it.

### New component signature

```tsx
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function PageHeaderBackButton({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="md:hidden flex items-center justify-center -ml-1 mr-2 shrink-0 size-8 rounded-md hover:bg-accent"
      aria-label="Go back"
    >
      <ArrowLeft className="size-4" />
    </Link>
  );
}
```

### Updated `PageHeader` layout

Change the `PageHeader` component to detect if a `PageHeaderBackButton` child is present and render it inline with the title area:

```tsx
export function PageHeader({ children }: { children: React.ReactNode }) {
  const backButton = filterChildren(children, [PageHeaderBackButton]);
  const titleArea = filterChildren(children, [PageHeaderTitle, PageHeaderDescription]);
  const actions = filterChildren(children, [PageHeaderActions]);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 flex items-start">
        {backButton}
        <div className="min-w-0 flex-1">{titleArea}</div>
      </div>
      {actions}
    </div>
  );
}
```

### Updated exports

Add `PageHeaderBackButton` to the module exports.

---

## Step 2: Add back button to all detail/sub-pages

Each page below needs `PageHeaderBackButton` added as a child of `PageHeader`, and `PageHeaderBackButton` added to the import from `@/components/custom/page-header`.

### Pages that need the back button

| # | File | Back URL |
|---|------|----------|
| 1 | `apps/web/src/routes/_app/dashboard/products/$productId.tsx` | `/dashboard/products` |
| 2 | `apps/web/src/routes/_app/dashboard/products/new.tsx` | `/dashboard/products` |
| 3 | `apps/web/src/routes/_app/dashboard/transactions/$id/index.tsx` | `/dashboard/transactions` |
| 4 | `apps/web/src/routes/_app/dashboard/transactions/$id/edit.tsx` | `/dashboard/transactions/$id` (back to detail, not list) |
| 5 | `apps/web/src/routes/_app/dashboard/transactions/new.tsx` | `/dashboard/transactions` |
| 6 | `apps/web/src/routes/_app/dashboard/recurring/$id.tsx` | `/dashboard/recurring` |
| 7 | `apps/web/src/routes/_app/dashboard/recurring/new.tsx` | `/dashboard/recurring` |
| 8 | `apps/web/src/routes/_app/dashboard/profile.tsx` | `/dashboard/more` |

### Pages that do NOT need a back button (top-level list/index pages)

- `dashboard/index.tsx` — home
- `dashboard/analytics.tsx` — top-level tab
- `dashboard/more.tsx` — top-level tab
- `dashboard/transactions/index.tsx` — list page
- `dashboard/products/index.tsx` — list page
- `dashboard/recurring/index.tsx` — list page
- `dashboard/tags/index.tsx` — list page

---

## Step 3: Example change for each page

The change is identical for every page. Example for `products/$productId.tsx`:

### Before (lines 36-41):
```tsx
<PageHeader>
  <PageHeaderTitle>Product Details</PageHeaderTitle>
  <PageHeaderDescription>
    View and edit the details about the product
  </PageHeaderDescription>
</PageHeader>
```

### After:
```tsx
<PageHeader>
  <PageHeaderBackButton to="/dashboard/products" />
  <PageHeaderTitle>Product Details</PageHeaderTitle>
  <PageHeaderDescription>
    View and edit the details about the product
  </PageHeaderDescription>
</PageHeader>
```

And update the import:
```tsx
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
```

---

## Step 4: Special case — `transactions/$id/edit.tsx`

This page should navigate back to the transaction detail page, not the list. The `to` prop needs the dynamic `$id` param:

```tsx
// In RouteComponent, get the id from the route
const { id } = Route.useParams();

// Then in JSX:
<PageHeader>
  <PageHeaderBackButton to={`/dashboard/transactions/${id}`} />
  <PageHeaderTitle>Edit Transaction</PageHeaderTitle>
  ...
</PageHeader>
```

This means `RouteComponent` in `transactions/$id/edit.tsx` needs to call `Route.useParams()` to access the `id` param. Currently the component doesn't use params directly (only the inner `EditTransactionFormWrapper` does), so add it.

---

## Summary of changes

| File | Change |
|------|--------|
| `apps/web/src/components/custom/page-header.tsx` | Add `PageHeaderBackButton` component, update `PageHeader` layout |
| 8 route files (listed in Step 2 table) | Add `PageHeaderBackButton` import + usage with correct `to` prop |

**Total files changed: 9**
