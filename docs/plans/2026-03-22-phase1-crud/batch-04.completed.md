# Batch 4: Product Client Layer + UI

> **Plan:** Phase 1: CRUD Operations
> **Goal:** Add missing update/delete operations for transactions and create/update/delete operations for products.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 11: Product validators + queries + mutations

**Depends on:** Task 10
**Can parallelize with:** Tasks 5, 6, 7

**Files:**
- Create: `src/features/products/product.validators.ts`
- Create: `src/features/products/product.validators.test.ts`
- Modify: `src/features/products/product.queries.ts`
- Create: `src/features/products/product.mutations.ts`

**Context:** Create the client-side Zod validators for create and edit product forms, add a product usage query, and create the mutations file with create/update/delete hooks. Follow the same patterns from `recurring.validators.ts`, `recurring.queries.ts`, and `recurring.mutations.ts`.

**Step 1: Write validator tests**

Create `src/features/products/product.validators.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { productValidators } from "./product.validators";

describe("productValidators", () => {
  describe("createFormValidation", () => {
    const schema = productValidators.createFormValidation;

    it("accepts a valid product name", () => {
      const result = schema.safeParse({ name: "Coffee" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = schema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("editFormValidation", () => {
    const schema = productValidators.editFormValidation;

    it("accepts a valid product name", () => {
      const result = schema.safeParse({ name: "Updated Coffee" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = schema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/products/product.validators.test.ts`
Expected: FAIL — Cannot find module `./product.validators`

**Step 3: Create the validators file**

Create `src/features/products/product.validators.ts`:

```ts
import z from "zod";

const createFormValidation = z.object({
  name: z.string().min(1, "Product name is required"),
});

const editFormValidation = z.object({
  name: z.string().min(1, "Product name is required"),
});

export const productValidators = {
  createFormValidation,
  editFormValidation,
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/products/product.validators.test.ts`
Expected: All 4 tests PASS

**Step 5: Add `getProductUsageOptions` to queries**

Replace `src/features/products/product.queries.ts` with:

```ts
import { queryOptions } from "@tanstack/react-query";
import { productController } from "./product.controller";

export const PRODUCT_QUERY_KEY = "products";

function getProductsOptions(filters?: { excludeTaggedProducts?: boolean }) {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, filters],
    queryFn: () => productController.getAll({ data: filters ?? {} }),
  });
}

function getProductOptions(productId: string) {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, productId],
    queryFn: () => productController.getProduct({ data: { productId } }),
  });
}

function getProductUsageOptions(productId: string) {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, productId, "usage"],
    queryFn: () =>
      productController.getProductUsage({ data: { productId } }),
  });
}

export const productQueries = {
  getProductsOptions,
  getProductOptions,
  getProductUsageOptions,
};
```

**Step 6: Create mutations file**

Create `src/features/products/product.mutations.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateProductDTO,
  UpdateProductDTO,
  productController,
} from "./product.controller";
import { PRODUCT_QUERY_KEY } from "./product.queries";

function createProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDTO) =>
      productController.createProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
  });
}

function updateProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProductDTO) =>
      productController.updateProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
  });
}

function deleteProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string }) =>
      productController.deleteProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
  });
}

export const productMutations = {
  createProduct,
  updateProduct,
  deleteProduct,
};
```

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add src/features/products/product.validators.ts src/features/products/product.validators.test.ts src/features/products/product.queries.ts src/features/products/product.mutations.ts
git commit -m "feat(products): add validators, product usage query, create/update/delete mutations"
```

---

## Task 12: Create product form + route

**Depends on:** Task 11
**Can parallelize with:** Tasks 5, 6, 7, Task 13

**Files:**
- Create: `src/features/products/components/create-product.form.tsx`
- Create: `src/routes/_app.dashboard.products.new.tsx`

**Context:** Build a simple create product form (just a name input) and a dedicated route page at `/dashboard/products/new`. On success, navigate to the new product's detail page. Follow `edit-recurring.form.tsx` for form pattern and `_app.dashboard.recurring.new.tsx` for the route structure (but using TanStack Form instead of raw useState).

**Step 1: Create the product form component**

Create `src/features/products/components/create-product.form.tsx`:

```tsx
import { useForm } from "@tanstack/react-form-start";
import { productValidators } from "../product.validators";
import { productMutations } from "../product.mutations";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import { LoaderButton } from "@/components/custom/loader.button";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function CreateProductForm() {
  const navigate = useNavigate();
  const mutation = productMutations.createProduct();

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onBlur: productValidators.createFormValidation,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        { name: value.name },
        {
          onSuccess: (data) => {
            const [err, product] = data;
            if (err) {
              toast.error("Failed to create product");
            } else {
              toast.success("Product created");
              navigate({
                to: "/dashboard/products/$productId",
                params: { productId: product.id },
              });
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
        name="name"
        children={(field) => (
          <>
            <label>Product Name</label>
            <Input
              name={field.name}
              type="text"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter product name..."
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
            {isSubmitting ? "..." : "Create Product"}
          </LoaderButton>
        )}
      />
    </form>
  );
}
```

**Step 2: Create the route page**

Create `src/routes/_app.dashboard.products.new.tsx`:

```tsx
import { CreateProductForm } from "@/features/products/components/create-product.form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/products/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h2>Create Product</h2>
      <CreateProductForm />
    </div>
  );
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/features/products/components/create-product.form.tsx src/routes/_app.dashboard.products.new.tsx
git commit -m "feat(products): add create product form and route page"
```

---

## Task 13: Edit product form component

**Depends on:** Task 11
**Can parallelize with:** Tasks 5, 6, 7, Task 12

**Files:**
- Create: `src/features/products/components/edit-product.form.tsx`

**Context:** An inline edit form for the product name on the detail page. Uses `useForm` from `@tanstack/react-form-start` with `onBlur` validation. On successful update, shows a success toast. This component receives the current product data as props (same pattern as `EditRecurringForm`).

**Step 1: Create the edit product form component**

Create `src/features/products/components/edit-product.form.tsx`:

```tsx
import { ProductWithTags } from "../product.models";
import { useForm } from "@tanstack/react-form-start";
import { productValidators } from "../product.validators";
import { productMutations } from "../product.mutations";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";

export function EditProductForm({ product }: { product: ProductWithTags }) {
  const mutation = productMutations.updateProduct();

  const form = useForm({
    defaultValues: {
      name: product.name,
    },
    validators: {
      onBlur: productValidators.editFormValidation,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          productId: product.id,
          name: value.name,
        },
        {
          onSuccess: (data) => {
            const [err] = data;
            if (err) {
              toast.error(err.message ?? "Failed to update product");
            } else {
              toast.success("Product updated");
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
        name="name"
        children={(field) => (
          <>
            <label>Product Name</label>
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
            {isSubmitting ? "..." : "Save"}
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
git add src/features/products/components/edit-product.form.tsx
git commit -m "feat(products): add edit product form component"
```

---

## Task 14: Delete product dialog + update detail page

**Depends on:** Tasks 11, 13
**Can parallelize with:** Tasks 5, 6, 7

**Files:**
- Create: `src/features/products/components/delete-product.alert.tsx`
- Modify: `src/routes/_app.dashboard.products.$productId.tsx`

**Context:** Build the delete product AlertDialog following `delete-recurring.alert.tsx`. This dialog is special: it shows a contextual cascade warning based on `getProductUsage` data (how many transactions will be cascade-deleted, whether recurring config will be removed). The product detail page needs to be updated to include the edit form, the delete dialog, and prefetch the product usage query.

**Step 1: Create the delete product dialog**

Create `src/features/products/components/delete-product.alert.tsx`:

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
import { productMutations } from "../product.mutations";
import { productQueries } from "../product.queries";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

function getWarningMessage(usage: {
  transactionCount: number;
  hasRecurring: boolean;
}): string {
  const { transactionCount, hasRecurring } = usage;

  if (transactionCount > 0 && hasRecurring) {
    return `This will also delete ${transactionCount} transaction${transactionCount === 1 ? "" : "s"} and its recurring configuration.`;
  }
  if (transactionCount > 0) {
    return `This will also delete ${transactionCount} transaction${transactionCount === 1 ? "" : "s"} associated with it.`;
  }
  if (hasRecurring) {
    return "This will also remove its recurring configuration.";
  }
  return "This action cannot be undone.";
}

export function DeleteProductDialog({ productId }: { productId: string }) {
  const navigate = useNavigate();
  const mutation = productMutations.deleteProduct();

  // Product usage is prefetched in the route loader, so this should be instant
  const { data: usageData } = useQuery(
    productQueries.getProductUsageOptions(productId),
  );

  const [usageErr, usage] = usageData ?? [null, null];
  const warningMessage =
    usage && !usageErr
      ? getWarningMessage(usage)
      : "This action cannot be undone.";

  function handleDelete() {
    mutation.mutate(
      { productId },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            toast.error(err.message ?? "Failed to delete product");
          } else {
            toast.success("Product deleted");
            navigate({ to: "/dashboard/products" });
          }
        },
      },
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Product</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this product?
          </AlertDialogTitle>
          <AlertDialogDescription>{warningMessage}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} variant="destructive">
            Delete Product
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 2: Update the product detail page**

Replace `src/routes/_app.dashboard.products.$productId.tsx` with:

```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateTagDialog } from "@/features/tags/components/create-tag.dialog";
import { LinkTagToProductDialog } from "@/features/tags/components/link-tag-to-product.dialog";
import { productQueries } from "@/features/products/product.queries";
import { tagMutations } from "@/features/tags/tag.mutations";
import { EditProductForm } from "@/features/products/components/edit-product.form";
import { DeleteProductDialog } from "@/features/products/components/delete-product.alert";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
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
    <Suspense fallback={<p>Loading product...</p>}>
      <Product />
    </Suspense>
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
            toast(err.message);
          } else {
            setEdited(false);
          }
        },
      },
    );
  }

  if (err) {
    const reason = err.reason;
    switch (reason) {
      case "PRODUCT_NOT_FOUND":
        return <p>Product with id {productId} not found</p>;
      case "PRODUCT_FORBIDDEN":
        return <p>You do not have access to product with id {productId}</p>;
      default:
        return <p>Unknown error: {reason satisfies never}</p>;
    }
  }

  return (
    <div>
      {/* Edit Product Name */}
      <h2>Edit Product</h2>
      <EditProductForm product={product} />

      {/* Tags Section */}
      <h3>Tags</h3>
      <div className="flex gap-2">
        {tags.map((tag) => (
          <Badge key={tag.id} variant="outline">
            {tag.name}
            <Button
              onClick={() => unlinkTag(tag.id)}
              variant="ghost"
              size="xs"
              className="px-0"
            >
              <X />
            </Button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <LinkTagToProductDialog product={product} />
        <CreateTagDialog />
        <Button
          disabled={!edited}
          onClick={() => console.log("TODO: Save new tags")}
        >
          Save
        </Button>
      </div>

      {/* Danger Zone */}
      <div>
        <h3>Danger Zone</h3>
        <DeleteProductDialog productId={productId} />
      </div>
    </div>
  );
}
```

**Key changes from original:**
1. Added `import { EditProductForm }` and `import { DeleteProductDialog }`
2. Added `productQueries.getProductUsageOptions(productId)` prefetch in loader
3. Replaced `<h2>Product: {product.name}</h2>` with an `<EditProductForm>` section
4. Added "Danger Zone" section with `<DeleteProductDialog>`

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Manual verification**

Start the dev server (`npm run dev`) and verify all product flows:

1. Navigate to `/dashboard/products` — confirm products are listed
2. Click a product — confirm detail page loads with edit form pre-populated
3. Change the name and submit — verify toast says "Product updated"
4. Click "Delete Product" — verify AlertDialog appears with appropriate cascade warning
5. Cancel the delete — verify dialog closes, nothing happens
6. Navigate to `/dashboard/products/new` — verify create form appears
7. Enter a product name and submit — verify navigation to the new product's detail page
8. Go back to the new product and delete it — verify navigation back to products list

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (validators + service tests from all batches)

**Step 6: Commit**

```bash
git add src/features/products/components/delete-product.alert.tsx src/features/products/components/edit-product.form.tsx src/routes/_app.dashboard.products.\$productId.tsx
git commit -m "feat(products): add delete dialog with cascade warning, integrate edit form and delete into detail page"
```
