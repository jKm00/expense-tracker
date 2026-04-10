# Batch 6: Products Redesign

> **Plan:** Phase 3: Full Redesign
> **Goal:** Complete visual overhaul — dark-mode-first theme, responsive layouts, skeleton loaders, standardized error handling, and consistent shadcn component usage.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 21: Create `product-list-item.tsx` Component

**Depends on:** Task 1 (needs Card component)
**Can parallelize with:** Task 22 (but 22 depends on 21)

**Files:**
- Create: `src/features/products/components/product-list-item.tsx`

**Context:** A card-style row for displaying a single product. Shows product name and inline tag badges. The entire card is tappable/clickable and navigates to the product detail page. Uses the existing `Badge` component already in the codebase.

**Step 1: Create the component**

Create `src/features/products/components/product-list-item.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import type { ProductWithTags } from "../product.models";

export function ProductListItem({
  product,
}: {
  product: ProductWithTags;
}) {
  return (
    <Link
      to="/dashboard/products/$productId"
      params={{ productId: product.id }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="flex items-center justify-between py-3">
          <p className="font-medium truncate">{product.name}</p>
          {product.tags.length > 0 && (
            <div className="flex gap-1 ml-2 shrink-0">
              {product.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
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
git add src/features/products/components/product-list-item.tsx
git commit -m "feat(products): add ProductListItem card component"
```

---

## Task 22: Create `product-list.tsx` Component

**Depends on:** Tasks 6 (EmptyState), 21 (ProductListItem)
**Can parallelize with:** Nothing in this batch

**Files:**
- Create: `src/features/products/components/product-list.tsx`

**Context:** Extracted product list component that receives product data and renders `ProductListItem` cards. Shows an empty state when there are no products. Takes a `title` prop to distinguish between "All Products" and "Untagged Products" sections.

**Step 1: Create the component**

Create `src/features/products/components/product-list.tsx`:

```tsx
import { EmptyState } from "@/components/custom/empty-state";
import { ProductListItem } from "./product-list-item";
import { PackageIcon } from "lucide-react";
import type { ProductWithTags } from "../product.models";

export function ProductList({
  products,
  title,
}: {
  products: ProductWithTags[];
  title?: string;
}) {
  return (
    <div className="space-y-3">
      {title && (
        <h2 className="text-lg font-semibold">{title}</h2>
      )}
      {products.length === 0 ? (
        <EmptyState
          message="No products found."
          icon={PackageIcon}
        />
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <ProductListItem key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/features/products/components/product-list.tsx
git commit -m "feat(products): add ProductList component with empty state"
```

---

## Task 23: Rewrite `_app.dashboard.products.index.tsx`

**Depends on:** Tasks 5 (PageHeader), 8 (SkeletonList), 22 (ProductList)
**Can parallelize with:** Tasks 24, 25

**Files:**
- Modify: `src/routes/_app.dashboard.products.index.tsx` (complete rewrite)

**Context:** The current products page renders two inline list functions (`UntaggedProductList` and `AllProductList`) with raw `<Link>` elements and `<p>` fallbacks. The rewrite adds a `PageHeader` with a "Create Product" action button, uses `SkeletonList` for loading states, and renders the extracted `ProductList` components.

**Step 1: Rewrite the products index route**

Replace the entire content of `src/routes/_app.dashboard.products.index.tsx` with:

```tsx
import { productQueries } from "@/features/products/product.queries";
import { ProductList } from "@/features/products/components/product-list";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonList } from "@/components/custom/skeleton-list";
import { Button } from "@/components/ui/button";
import { ProductWithTags } from "@/features/products/product.models";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { PlusIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/products/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      productQueries.getProductsOptions(),
    );
    await context.queryClient.prefetchQuery(
      productQueries.getProductsOptions({
        excludeTaggedProducts: true,
      }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        action={
          <Button asChild size="sm">
            <Link to="/dashboard/products/new">
              <PlusIcon className="size-4 mr-2" />
              Create Product
            </Link>
          </Button>
        }
      />
      <div className="space-y-8">
        <Suspense fallback={<SkeletonList rows={3} />}>
          <UntaggedProductList />
        </Suspense>
        <Suspense fallback={<SkeletonList rows={5} />}>
          <AllProductList />
        </Suspense>
      </div>
    </div>
  );
}

function UntaggedProductList() {
  const { data, error } = useSuspenseQuery(
    productQueries.getProductsOptions({
      excludeTaggedProducts: true,
    }),
  );

  if (error) {
    return <p className="text-muted-foreground">Failed to load untagged products.</p>;
  }

  const [err, products] = data;

  if (err || !products) {
    return <p className="text-muted-foreground">Failed to load untagged products.</p>;
  }

  return <ProductList products={products} title="Untagged Products" />;
}

function AllProductList() {
  const { data, error } = useSuspenseQuery(productQueries.getProductsOptions());

  if (error) {
    return <p className="text-muted-foreground">Failed to load products.</p>;
  }

  const [err, products] = data;

  if (err || !products) {
    return <p className="text-muted-foreground">Failed to load products.</p>;
  }

  return <ProductList products={products} title="All Products" />;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server and:
1. Navigate to `/dashboard/products` — verify PageHeader with "Create Product" button
2. Verify card-style product list items with tag badges
3. Click "Create Product" — verify navigation to `/dashboard/products/new`
4. Click a product — verify navigation to its detail page

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.products.index.tsx
git commit -m "feat(products): redesign products list with PageHeader, skeleton, and card items"
```

---

## Task 24: Rewrite `_app.dashboard.products.$productId.tsx`

**Depends on:** Tasks 5 (PageHeader), 6 (EmptyState), 7 (FormField), 8 (SkeletonForm), 13 (getErrorMessage)
**Can parallelize with:** Tasks 23, 25

**Files:**
- Modify: `src/routes/_app.dashboard.products.$productId.tsx` (rewrite with skeleton + PageHeader + EmptyState + Card wrappers)

**Context:** The current product detail page has raw `<h2>/<h3>` headings and no loading states. The rewrite adds `SkeletonForm` loading fallback, `PageHeader`, uses `EmptyState` for error states, and wraps sections in `Card` components. The existing `EditProductForm`, `DeleteProductDialog`, tag management, and tag dialogs are all kept — just wrapped in better layout.

**Step 1: Rewrite the product detail route**

Replace the entire content of `src/routes/_app.dashboard.products.$productId.tsx` with:

```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreateTagDialog } from "@/features/tags/components/create-tag.dialog";
import { LinkTagToProductDialog } from "@/features/tags/components/link-tag-to-product.dialog";
import { productQueries } from "@/features/products/product.queries";
import { tagMutations } from "@/features/tags/tag.mutations";
import { EditProductForm } from "@/features/products/components/edit-product.form";
import { DeleteProductDialog } from "@/features/products/components/delete-product.alert";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeleton-form";
import { EmptyState } from "@/components/custom/empty-state";
import { getErrorMessage } from "@/utils/error-messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { X, AlertTriangleIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard/products/$productId")({
  loader: ({ params, context }) => {
    const productId = params.productId;
    context.queryClient.ensureQueryData(
      productQueries.getProductOptions(productId),
    );
    context.queryClient.prefetchQuery(
      productQueries.getProductUsageOptions(productId),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Product Details" />
      <Suspense fallback={<SkeletonForm fields={3} />}>
        <Product />
      </Suspense>
    </div>
  );
}

function Product() {
  const { productId } = Route.useParams();
  const { data } = useSuspenseQuery(
    productQueries.getProductOptions(productId),
  );
  const mutation = tagMutations.unlinkTagFromProduct();

  const [err, product] = data;
  const tags = product?.tags ?? [];

  const [edited, setEdited] = useState(false);

  function unlinkTag(tagId: string) {
    mutation.mutate(
      {
        tagId,
        productId,
      },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            toast.error(err.message);
          } else {
            setEdited(false);
          }
        },
      },
    );
  }

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
      {/* Edit Product Name */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Product</CardTitle>
        </CardHeader>
        <CardContent>
          <EditProductForm product={product} />
        </CardContent>
      </Card>

      {/* Tags Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags assigned.</p>
            ) : (
              tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {tag.name}
                  <Button
                    onClick={() => unlinkTag(tag.id)}
                    variant="ghost"
                    size="xs"
                    className="px-0 ml-1"
                  >
                    <X className="size-3" />
                  </Button>
                </Badge>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <LinkTagToProductDialog product={product} />
            <CreateTagDialog />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteProductDialog productId={productId} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Key changes from current file:**
- Added `PageHeader`, `SkeletonForm`, `EmptyState`, `Card` wrappers
- Removed the unused `edited` state "Save" button (it was a TODO)
- Replaced raw `<p>` error messages with `EmptyState` components
- Wrapped sections in `Card` components with proper headers
- Added `border-destructive/50` styling to the danger zone card

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server and:
1. Navigate to a product detail page — verify cards for edit form, tags, and danger zone
2. Verify tag badges render correctly with remove buttons
3. Verify error states render EmptyState component

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.products.\$productId.tsx
git commit -m "feat(products): redesign product detail with PageHeader, skeleton, EmptyState, and Card layout"
```

---

## Task 25: Rewrite `_app.dashboard.products.new.tsx`

**Depends on:** Tasks 5 (PageHeader), 7 (FormField), 8 (SkeletonForm)
**Can parallelize with:** Tasks 23, 24

**Files:**
- Modify: `src/routes/_app.dashboard.products.new.tsx` (rewrite with PageHeader + Card wrapper)

**Context:** The current create product page has just a raw `<h2>` and the `CreateProductForm` component. The rewrite adds a `PageHeader` and wraps the form in a `Card`. The existing `CreateProductForm` component is kept as-is — it already uses TanStack Form from Phase 1.

**Step 1: Rewrite the create product route**

Replace the entire content of `src/routes/_app.dashboard.products.new.tsx` with:

```tsx
import { CreateProductForm } from "@/features/products/components/create-product.form";
import { PageHeader } from "@/components/custom/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/products/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Create Product" />
      <Card>
        <CardHeader>
          <CardTitle>New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateProductForm />
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
1. Navigate to `/dashboard/products/new` — verify PageHeader and Card-wrapped form
2. Create a product — verify it navigates to the product detail page

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.products.new.tsx
git commit -m "feat(products): redesign create product page with PageHeader and Card layout"
```
