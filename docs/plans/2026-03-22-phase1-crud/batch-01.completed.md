# Batch 1: Transaction Backend

> **Plan:** Phase 1: CRUD Operations
> **Goal:** Add missing update/delete operations for transactions and create/update/delete operations for products.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 1: Transaction repo — get, update, remove

**Depends on:** Nothing
**Can parallelize with:** Task 8

**Files:**
- Modify: `src/features/transactions/transaction.repo.ts`
- Modify: `src/features/transactions/transaction.models.ts` (add `UpdateTransaction` type)
- Test: `src/features/transactions/transaction.repo.test.ts`

**Context:** The existing `transactionRepo` only has `getAll(userId)` and `save(data)`. We need three new methods: `get(id)` to fetch a single transaction, `update(id, data)` to update mutable fields, and `remove(id)` to delete. Follow the same Drizzle patterns already used in `recurring.repo.ts`.

**Step 1: Add `UpdateTransaction` type to models**

In `src/features/transactions/transaction.models.ts`, add this type after the existing exports:

```ts
// The mutable fields of a transaction — productId, source, userId, createdAt are immutable
export type UpdateTransaction = Partial<
  Pick<Transaction, "price" | "type" | "date" | "description">
>;
```

The full file should look like:

```ts
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { transaction, transactionType, transactionSource } from "./transaction.schema";

export type Transaction = InferSelectModel<typeof transaction>;
export type NewTransaction = InferInsertModel<typeof transaction>;

export type TransactionType = (typeof transactionType.enumValues)[number];
export type TransactionSource = (typeof transactionSource.enumValues)[number];

// The mutable fields of a transaction — productId, source, userId, createdAt are immutable
export type UpdateTransaction = Partial<
  Pick<Transaction, "price" | "type" | "date" | "description">
>;
```

**Step 2: Add `get`, `update`, `remove` to transaction repo**

In `src/features/transactions/transaction.repo.ts`, add these three methods and update the export:

```ts
import { db } from "@/lib/db";
import { NewTransaction, UpdateTransaction } from "./transaction.models";
import { transaction } from "./transaction.schema";
import { eq } from "drizzle-orm";
import { product } from "../products/product.schema";

async function getAll(userId: string) {
  return await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .leftJoin(product, eq(product.id, transaction.productId));
}

async function get(id: string) {
  const rows = await db
    .select()
    .from(transaction)
    .where(eq(transaction.id, id));
  return rows[0] ?? null;
}

async function save(data: NewTransaction) {
  return (await db.insert(transaction).values(data).returning())[0];
}

async function update(id: string, data: UpdateTransaction) {
  return (
    await db
      .update(transaction)
      .set(data)
      .where(eq(transaction.id, id))
      .returning()
  )[0];
}

async function remove(id: string) {
  return (
    await db
      .delete(transaction)
      .where(eq(transaction.id, id))
      .returning()
  )[0];
}

export const transactionRepo = {
  getAll,
  get,
  save,
  update,
  remove,
};
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to transaction.repo.ts or transaction.models.ts

**Step 4: Commit**

```bash
git add src/features/transactions/transaction.repo.ts src/features/transactions/transaction.models.ts
git commit -m "feat(transactions): add get, update, remove repo methods"
```

---

## Task 2: Transaction service — get, update, delete

**Depends on:** Task 1
**Can parallelize with:** Tasks 8, 9

**Files:**
- Modify: `src/features/transactions/transaction.service.ts`
- Test: `src/features/transactions/transaction.service.test.ts`

**Context:** The existing `transactionService` only has `getTransactions(userId)` and `addTransaction(userId, data)`. We need `getTransaction(userId, id)` with ownership check, `updateTransaction(userId, id, data)` that validates ownership then updates, and `deleteTransaction(userId, id)` that validates ownership then deletes. Follow the exact pattern from `recurring.service.ts` — fetch first, check ownership, then operate.

**Step 1: Write service tests**

Create `src/features/transactions/transaction.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { transactionService } from "./transaction.service";
import { transactionRepo } from "./transaction.repo";

// Mock the repo module
vi.mock("./transaction.repo", () => ({
  transactionRepo: {
    getAll: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockRepo = vi.mocked(transactionRepo);

describe("transactionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTransaction", () => {
    it("returns error when transaction not found", async () => {
      mockRepo.get.mockResolvedValue(null);

      const [err, data] = await transactionService.getTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_NOT_FOUND");
      expect(data).toBeNull();
    });

    it("returns error when user does not own transaction", async () => {
      mockRepo.get.mockResolvedValue({
        id: "txn-1",
        userId: "other-user",
        productId: "prod-1",
        price: "10.00",
        type: "expense",
        source: "manual",
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      });

      const [err, data] = await transactionService.getTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_FORBIDDEN");
      expect(data).toBeNull();
    });

    it("returns transaction when user owns it", async () => {
      const mockTransaction = {
        id: "txn-1",
        userId: "user-1",
        productId: "prod-1",
        price: "10.00",
        type: "expense" as const,
        source: "manual" as const,
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      };
      mockRepo.get.mockResolvedValue(mockTransaction);

      const [err, data] = await transactionService.getTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).toBeNull();
      expect(data).toEqual(mockTransaction);
    });
  });

  describe("updateTransaction", () => {
    it("returns error when transaction not found", async () => {
      mockRepo.get.mockResolvedValue(null);

      const [err] = await transactionService.updateTransaction(
        "user-1",
        "txn-1",
        { price: "20.00" },
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_NOT_FOUND");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("returns error when user does not own transaction", async () => {
      mockRepo.get.mockResolvedValue({
        id: "txn-1",
        userId: "other-user",
        productId: "prod-1",
        price: "10.00",
        type: "expense",
        source: "manual",
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      });

      const [err] = await transactionService.updateTransaction(
        "user-1",
        "txn-1",
        { price: "20.00" },
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_FORBIDDEN");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("updates and returns transaction when user owns it", async () => {
      const existing = {
        id: "txn-1",
        userId: "user-1",
        productId: "prod-1",
        price: "10.00",
        type: "expense" as const,
        source: "manual" as const,
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      };
      const updated = { ...existing, price: "20.00" };

      mockRepo.get.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue(updated);

      const [err, data] = await transactionService.updateTransaction(
        "user-1",
        "txn-1",
        { price: "20.00" },
      );

      expect(err).toBeNull();
      expect(data).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith("txn-1", {
        price: "20.00",
      });
    });
  });

  describe("deleteTransaction", () => {
    it("returns error when transaction not found", async () => {
      mockRepo.get.mockResolvedValue(null);

      const [err] = await transactionService.deleteTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_NOT_FOUND");
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });

    it("returns error when user does not own transaction", async () => {
      mockRepo.get.mockResolvedValue({
        id: "txn-1",
        userId: "other-user",
        productId: "prod-1",
        price: "10.00",
        type: "expense",
        source: "manual",
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      });

      const [err] = await transactionService.deleteTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).not.toBeNull();
      expect(err!.reason).toBe("TRANSACTION_FORBIDDEN");
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });

    it("deletes and returns transaction when user owns it", async () => {
      const existing = {
        id: "txn-1",
        userId: "user-1",
        productId: "prod-1",
        price: "10.00",
        type: "expense" as const,
        source: "manual" as const,
        date: "2026-01-01",
        description: null,
        createdAt: new Date(),
      };

      mockRepo.get.mockResolvedValue(existing);
      mockRepo.remove.mockResolvedValue(existing);

      const [err, data] = await transactionService.deleteTransaction(
        "user-1",
        "txn-1",
      );

      expect(err).toBeNull();
      expect(data).toEqual(existing);
      expect(mockRepo.remove).toHaveBeenCalledWith("txn-1");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/transactions/transaction.service.test.ts`
Expected: FAIL — `transactionService.getTransaction is not a function` (methods don't exist yet)

**Step 3: Implement service methods**

Replace `src/features/transactions/transaction.service.ts` with:

```ts
import { err, ok } from "@/utils/result";
import { productService } from "../products/product.service";
import { CreateTransactionInput } from "./transaction.dtos";
import { UpdateTransaction } from "./transaction.models";
import { transactionRepo } from "./transaction.repo";

async function getTransactions(userId: string) {
  try {
    return ok(await transactionRepo.getAll(userId));
  } catch (error) {
    return err({
      reason: "TRANSACTION_DB_ERROR" as const,
      error: JSON.stringify(error),
    });
  }
}

async function getTransaction(userId: string, id: string) {
  const found = await transactionRepo.get(id);
  if (!found) {
    return err({
      reason: "TRANSACTION_NOT_FOUND" as const,
      message: `Transaction with id ${id} was not found`,
    });
  }

  if (found.userId !== userId) {
    return err({
      reason: "TRANSACTION_FORBIDDEN" as const,
      message: `User with id ${userId} does not have access to transaction with id ${id}`,
    });
  }

  return ok(found);
}

async function updateTransaction(
  userId: string,
  id: string,
  data: UpdateTransaction,
) {
  const [foundError] = await getTransaction(userId, id);
  if (foundError) {
    return err(foundError);
  }

  try {
    const updated = await transactionRepo.update(id, data);
    return ok(updated);
  } catch (error) {
    return err({
      reason: "TRANSACTION_UPDATE_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function deleteTransaction(userId: string, id: string) {
  const [foundError] = await getTransaction(userId, id);
  if (foundError) {
    return err(foundError);
  }

  try {
    const deleted = await transactionRepo.remove(id);
    return ok(deleted);
  } catch (error) {
    return err({
      reason: "TRANSACTION_DELETE_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function addTransaction(userId: string, data: CreateTransactionInput) {
  let [foundError, found] = await productService.getByName(userId, data.productName);

  if (foundError) {
    return err({
      reason: "PRODUCT_SEARCH_ERROR" as const,
      error: foundError,
    });
  }

  if (!found) {
    const [createError, created] = await productService.create(
      userId,
      data.productName,
    );
    if (createError) {
      return err({
        reason: "PRODUCT_CREATION_ERROR" as const,
        error: createError,
      });
    }
    found = created;
  }

  try {
    const res = await transactionRepo.save({
      userId,
      productId: found.id,
      price: data.price.toString(),
      type: data.type,
      source: data.source,
      date: new Date().toISOString().split("T")[0],
      description: data.description,
    });
    return ok(res);
  } catch (error) {
    return err({
      reason: "TRANSACTION_CREATION_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const transactionService = {
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  addTransaction,
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/transactions/transaction.service.test.ts`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add src/features/transactions/transaction.service.ts src/features/transactions/transaction.service.test.ts
git commit -m "feat(transactions): add getTransaction, updateTransaction, deleteTransaction service methods"
```

---

## Task 3: Transaction controller — get, update, delete

**Depends on:** Task 2
**Can parallelize with:** Tasks 8, 9, 10

**Files:**
- Modify: `src/features/transactions/transaction.controller.ts`

**Context:** Add three new server functions following the exact pattern from `recurring.controller.ts`. Each uses `authenticated` middleware and a Zod `inputValidator`. The `getTransaction` uses GET method, the others use POST.

**Step 1: Update the transaction controller**

Replace `src/features/transactions/transaction.controller.ts` with:

```ts
import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { authenticated } from "../auth/auth.utils";
import { transactionService } from "./transaction.service";

// TODO: Add pagination
const getTransactions = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await transactionService.getTransactions(userId);
  });

const TransactionIdSchema = z.object({
  id: z.string(),
});

const getTransaction = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(TransactionIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.getTransaction(userId, data.id);
  });

const NewTransactionSchema = z.object({
  productName: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  type: z.enum(["expense", "income"]),
  source: z.enum(["receipt", "recurring", "manual"]),
});

const addTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(NewTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.addTransaction(userId, data);
  });

const UpdateTransactionSchema = z.object({
  id: z.string(),
  price: z.number().min(0),
  type: z.enum(["expense", "income"]),
  date: z.string(),
  description: z.string().optional(),
});

export type UpdateTransactionDTO = z.infer<typeof UpdateTransactionSchema>;

const updateTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(UpdateTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.updateTransaction(userId, data.id, {
      price: data.price.toString(),
      type: data.type,
      date: data.date,
      description: data.description,
    });
  });

const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(TransactionIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.deleteTransaction(userId, data.id);
  });

export const transactionController = {
  addTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/features/transactions/transaction.controller.ts
git commit -m "feat(transactions): add getTransaction, updateTransaction, deleteTransaction server functions"
```
