# Batch 3: Product Backend

> **Plan:** Phase 1: CRUD Operations
> **Goal:** Add missing update/delete operations for transactions and create/update/delete operations for products.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 8: Product repo — getUsage

**Depends on:** Nothing
**Can parallelize with:** Task 1

**Files:**
- Modify: `src/features/products/product.repo.ts`

**Context:** The `productRepo` already has `get`, `getByName`, `getAll`, `getUntaggedProducts`, `save`, `update`, and `deleteProduct`. We only need to add `getUsage(productId)` which counts how many transactions reference this product and whether any recurring items reference it. This data is needed for the delete confirmation dialog's cascade warning.

**Important:** `productRepo.update` and `productRepo.deleteProduct` already exist but `update` doesn't return the updated row and `deleteProduct` doesn't return the deleted row. We need to modify both to return values for consistency with the service layer's `ok(result)` pattern.

**Step 1: Add `getUsage` and update `update`/`deleteProduct` to return rows**

In `src/features/products/product.repo.ts`, add the following import and method, and modify the existing `update` and `deleteProduct`:

```ts
import { db } from "@/lib/db";
import type { Product } from "./product.models";
import { and, count, eq, ilike, notExists } from "drizzle-orm";
import { product } from "./product.schema";
import { productTag, tag } from "../tags/tag.schema";
import { productMappers } from "./product.mappers";
import { transaction } from "../transactions/transaction.schema";
import { recurringProduct } from "../recurring/recurring.schema";

async function get(id: string) {
  return await db.query.product.findFirst({
    with: {
      tags: true,
    },
    where: {
      id,
    },
  });
}

async function getByName(userId: string, name: string) {
  const res = await db
    .select()
    .from(product)
    .where(and(eq(product.userId, userId), ilike(product.name, name)));

  if (res.length === 0) return undefined;

  return res[0];
}

async function getAll(userId: string) {
  const products = await db
    .select({
      product,
      tag,
    })
    .from(product)
    .leftJoin(productTag, eq(product.id, productTag.productId))
    .leftJoin(tag, eq(productTag.tagId, tag.id))
    .where(eq(product.userId, userId));
  return productMappers.mapToProductsWithTags(products);
}

async function getUntaggedProducts(userId: string) {
  const products = await db
    .select({
      product,
      tag,
    })
    .from(product)
    .leftJoin(productTag, eq(product.id, productTag.productId))
    .leftJoin(tag, eq(productTag.tagId, tag.id))
    .where(
      and(
        eq(product.userId, userId),
        notExists(
          db
            .select()
            .from(productTag)
            .where(eq(productTag.productId, product.id)),
        ),
      ),
    );
  return productMappers.mapToProductsWithTags(products);
}

async function save(data: Omit<Product, "id" | "createdAt" | "updatedAt">) {
  return (await db.insert(product).values(data).returning())[0];
}

async function update(
  id: string,
  data: Partial<Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  return (
    await db
      .update(product)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(product.id, id))
      .returning()
  )[0];
}

async function deleteProduct(id: string) {
  return (
    await db.delete(product).where(eq(product.id, id)).returning()
  )[0];
}

async function getUsage(productId: string) {
  const transactionCount = await db
    .select({ count: count() })
    .from(transaction)
    .where(eq(transaction.productId, productId))
    .then((r) => Number(r[0].count));

  const hasRecurring = await db
    .select({ id: recurringProduct.id })
    .from(recurringProduct)
    .where(eq(recurringProduct.productId, productId))
    .then((r) => r.length > 0);

  return { transactionCount, hasRecurring };
}

export const productRepo = {
  get,
  getByName,
  getAll,
  getUntaggedProducts,
  save,
  update,
  deleteProduct,
  getUsage,
};
```

**Key changes from original:**
1. Added `import { count } from "drizzle-orm"` (add to existing import)
2. Added `import { transaction }` and `import { recurringProduct }`
3. Modified `update` to use `.returning()` and return the first row (previously it returned `void`)
4. Modified `deleteProduct` to use `.returning()` and return the deleted row (previously it returned `void`)
5. Added `getUsage` method

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/products/product.repo.ts
git commit -m "feat(products): add getUsage repo method, update/delete now return rows"
```

---

## Task 9: Product service — update, delete, getProductUsage

**Depends on:** Task 8
**Can parallelize with:** Tasks 1, 2, 4

**Files:**
- Modify: `src/features/products/product.service.ts`
- Create: `src/features/products/product.service.test.ts`

**Context:** Add `updateProduct`, `deleteProduct`, and `getProductUsage` to the service. Each performs an ownership check (via the existing `getProduct` method) before operating. Follow the exact pattern from `recurring.service.ts`.

**Step 1: Write service tests**

Create `src/features/products/product.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { productService } from "./product.service";
import { productRepo } from "./product.repo";

vi.mock("./product.repo", () => ({
  productRepo: {
    get: vi.fn(),
    getByName: vi.fn(),
    getAll: vi.fn(),
    getUntaggedProducts: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    deleteProduct: vi.fn(),
    getUsage: vi.fn(),
  },
}));

const mockRepo = vi.mocked(productRepo);

const mockProduct = {
  id: "prod-1",
  userId: "user-1",
  name: "Coffee",
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
};

describe("productService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProduct", () => {
    it("returns error when product not found", async () => {
      mockRepo.get.mockResolvedValue(undefined);

      const [err] = await productService.updateProduct("user-1", "prod-1", {
        name: "New Name",
      });

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("returns error when user does not own product", async () => {
      mockRepo.get.mockResolvedValue({
        ...mockProduct,
        userId: "other-user",
      });

      const [err] = await productService.updateProduct("user-1", "prod-1", {
        name: "New Name",
      });

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_FORBIDDEN");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("updates and returns product when user owns it", async () => {
      const updated = { ...mockProduct, name: "New Name" };
      mockRepo.get.mockResolvedValue(mockProduct);
      mockRepo.update.mockResolvedValue(updated);

      const [err, data] = await productService.updateProduct(
        "user-1",
        "prod-1",
        { name: "New Name" },
      );

      expect(err).toBeNull();
      expect(data).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith("prod-1", {
        name: "New Name",
      });
    });
  });

  describe("deleteProduct", () => {
    it("returns error when product not found", async () => {
      mockRepo.get.mockResolvedValue(undefined);

      const [err] = await productService.deleteProduct("user-1", "prod-1");

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_NOT_FOUND");
      expect(mockRepo.deleteProduct).not.toHaveBeenCalled();
    });

    it("returns error when user does not own product", async () => {
      mockRepo.get.mockResolvedValue({
        ...mockProduct,
        userId: "other-user",
      });

      const [err] = await productService.deleteProduct("user-1", "prod-1");

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_FORBIDDEN");
      expect(mockRepo.deleteProduct).not.toHaveBeenCalled();
    });

    it("deletes and returns product when user owns it", async () => {
      mockRepo.get.mockResolvedValue(mockProduct);
      mockRepo.deleteProduct.mockResolvedValue(mockProduct);

      const [err, data] = await productService.deleteProduct(
        "user-1",
        "prod-1",
      );

      expect(err).toBeNull();
      expect(data).toEqual(mockProduct);
      expect(mockRepo.deleteProduct).toHaveBeenCalledWith("prod-1");
    });
  });

  describe("getProductUsage", () => {
    it("returns error when product not found", async () => {
      mockRepo.get.mockResolvedValue(undefined);

      const [err] = await productService.getProductUsage("user-1", "prod-1");

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("PRODUCT_NOT_FOUND");
    });

    it("returns usage data when product exists and user owns it", async () => {
      const usage = { transactionCount: 5, hasRecurring: true };
      mockRepo.get.mockResolvedValue(mockProduct);
      mockRepo.getUsage.mockResolvedValue(usage);

      const [err, data] = await productService.getProductUsage(
        "user-1",
        "prod-1",
      );

      expect(err).toBeNull();
      expect(data).toEqual(usage);
      expect(mockRepo.getUsage).toHaveBeenCalledWith("prod-1");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/products/product.service.test.ts`
Expected: FAIL — `productService.updateProduct is not a function`

**Step 3: Implement service methods**

Replace `src/features/products/product.service.ts` with:

```ts
import { err, ok } from "@/utils/result";
import { productRepo } from "./product.repo";

async function getAll(
  userId: string,
  filters?: {
    excludeTaggedProducts?: boolean;
  },
) {
  try {
    const products = filters?.excludeTaggedProducts
      ? await productRepo.getUntaggedProducts(userId)
      : await productRepo.getAll(userId);

    return ok(products);
  } catch (error) {
    return err({
      reason: "DB_ERROR" as const,
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function getProduct(userId: string, productId: string) {
  const product = await productRepo.get(productId);

  if (!product) {
    return err({
      reason: "PRODUCT_NOT_FOUND" as const,
      message: `Product with id ${productId} not found`,
    });
  }

  if (product.userId !== userId) {
    return err({
      reason: "PRODUCT_FORBIDDEN" as const,
      message: `Product with id ${productId} is not a product of user with id ${userId}`,
    });
  }

  return ok(product);
}

async function getByName(userId: string, name: string) {
  try {
    const found = await productRepo.getByName(userId, name);
    return ok(found);
  } catch (error) {
    return err({
      reason: "DB_ERROR" as const,
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function create(userId: string, product: string) {
  try {
    const saved = await productRepo.save({ userId, name: product });
    return ok(saved);
  } catch (error) {
    return err({
      reason: "DB_ERROR" as const,
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function updateProduct(
  userId: string,
  productId: string,
  data: { name: string },
) {
  const [productError] = await getProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  try {
    const updated = await productRepo.update(productId, data);
    return ok(updated);
  } catch (error) {
    return err({
      reason: "PRODUCT_UPDATE_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function deleteProduct(userId: string, productId: string) {
  const [productError] = await getProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  try {
    const deleted = await productRepo.deleteProduct(productId);
    return ok(deleted);
  } catch (error) {
    return err({
      reason: "PRODUCT_DELETE_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getProductUsage(userId: string, productId: string) {
  const [productError] = await getProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  try {
    const usage = await productRepo.getUsage(productId);
    return ok(usage);
  } catch (error) {
    return err({
      reason: "DB_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const productService = {
  getAll,
  getProduct,
  getByName,
  create,
  updateProduct,
  deleteProduct,
  getProductUsage,
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/products/product.service.test.ts`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add src/features/products/product.service.ts src/features/products/product.service.test.ts
git commit -m "feat(products): add updateProduct, deleteProduct, getProductUsage service methods"
```

---

## Task 10: Product controller — create, update, delete, getProductUsage

**Depends on:** Task 9
**Can parallelize with:** Tasks 1-4

**Files:**
- Modify: `src/features/products/product.controller.ts`

**Context:** Add four new server functions following `recurring.controller.ts`. Reuse the existing `ProductIdSchema` for get/delete. Create new schemas for create and update inputs.

**Step 1: Update the product controller**

Replace `src/features/products/product.controller.ts` with:

```ts
import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { productService } from "./product.service";
import z from "zod";

const FiltersSchema = z.object({
  excludeTaggedProducts: z.boolean().optional(),
});

const getAll = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(FiltersSchema)
  .handler(async ({ context, data }) => {
    return await productService.getAll(context.user.id, {
      excludeTaggedProducts: data.excludeTaggedProducts,
    });
  });

const ProductIdSchema = z.object({
  productId: z.string(),
});

const getProduct = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(ProductIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await productService.getProduct(userId, data.productId);
  });

const CreateProductSchema = z.object({
  name: z.string().min(1),
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

const createProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(CreateProductSchema)
  .handler(async ({ context, data }) => {
    return await productService.create(context.user.id, data.name);
  });

const UpdateProductSchema = z.object({
  productId: z.string(),
  name: z.string().min(1),
});

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

const updateProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(UpdateProductSchema)
  .handler(async ({ context, data }) => {
    return await productService.updateProduct(context.user.id, data.productId, {
      name: data.name,
    });
  });

const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(ProductIdSchema)
  .handler(async ({ context, data }) => {
    return await productService.deleteProduct(context.user.id, data.productId);
  });

const getProductUsage = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(ProductIdSchema)
  .handler(async ({ context, data }) => {
    return await productService.getProductUsage(
      context.user.id,
      data.productId,
    );
  });

export const productController = {
  getAll,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductUsage,
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/products/product.controller.ts
git commit -m "feat(products): add createProduct, updateProduct, deleteProduct, getProductUsage server functions"
```
