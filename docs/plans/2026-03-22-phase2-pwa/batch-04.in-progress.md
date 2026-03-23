# Batch 4: Offline Mutation Guards

> **Plan:** Phase 2: PWA Support
> **Goal:** Add Progressive Web App capabilities so the expense tracker can be installed on mobile devices, persists query data for offline reads, and shows an offline indicator with mutation guards.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 12: Offline mutation guard utility

**Depends on:** Nothing (pure utility function)
**Can parallelize with:** Nothing

**Files:**
- Create: `src/lib/offline-guard.ts`
- Create: `src/lib/offline-guard.test.ts`

**Context:** All mutations should check `navigator.onLine` before attempting server calls. When offline, they should throw an error that the mutation's `onError` handler can catch and display as a toast. This utility provides a single `assertOnline()` function that throws an `OfflineError` — keeping the guard DRY across all 10+ mutation functions.

**Step 1: Write the test**

Create `src/lib/offline-guard.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { assertOnline, OfflineError } from "./offline-guard";

describe("assertOnline", () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  it("does not throw when online", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });

    expect(() => assertOnline()).not.toThrow();
  });

  it("throws OfflineError when offline", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    expect(() => assertOnline()).toThrow(OfflineError);
    expect(() => assertOnline()).toThrow(
      "You're offline. Please reconnect to save changes.",
    );
  });

  it("OfflineError is instanceof Error", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    try {
      assertOnline();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(OfflineError);
    }
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/offline-guard.test.ts`
Expected: FAIL — `Cannot find module './offline-guard'`

**Step 3: Implement the utility**

Create `src/lib/offline-guard.ts`:

```ts
export class OfflineError extends Error {
  constructor() {
    super("You're offline. Please reconnect to save changes.");
    this.name = "OfflineError";
  }
}

/**
 * Throws an OfflineError if the browser is currently offline.
 * Call this at the start of every mutation function to prevent
 * server calls while offline.
 *
 * @throws {OfflineError} when navigator.onLine is false
 */
export function assertOnline(): void {
  if (!navigator.onLine) {
    throw new OfflineError();
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/offline-guard.test.ts`
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/lib/offline-guard.ts src/lib/offline-guard.test.ts
git commit -m "feat(pwa): create assertOnline utility for offline mutation guards"
```

---

## Task 13: Add offline guards to all mutations

**Depends on:** Task 12 (assertOnline must exist)
**Can parallelize with:** Nothing

**Files:**
- Modify: `src/features/transactions/transaction.mutations.ts`
- Modify: `src/features/products/product.mutations.ts`
- Modify: `src/features/recurring/recurring.mutations.ts`
- Modify: `src/features/tags/tag.mutations.ts`

**Context:** Every mutation hook's `mutationFn` must call `assertOnline()` before making the server call. If offline, `assertOnline()` throws an `OfflineError`, which triggers the mutation's `onError` callback. We also add a shared `onError` handler to each mutation that shows a toast with the error message.

The pattern for every mutation file is identical — three targeted edits per file:
1. Add two imports at the top: `assertOnline` from `@/lib/offline-guard` and `toast` from `sonner`
2. In each `mutationFn`, convert arrow shorthand to block body, add `assertOnline()` as first line
3. Add `onError: (error) => { toast.error(error.message); }` after each `onSuccess`

### File 1: `src/features/transactions/transaction.mutations.ts`

**Edit 1 — Add imports** (after line 1):

```diff
 import { useMutation, useQueryClient } from "@tanstack/react-query";
+import { toast } from "sonner";
 import { CreateTransactionInput } from "./transaction.dtos";
 import {
   transactionController,
   UpdateTransactionDTO,
 } from "./transaction.controller";
 import { QUERY_KEY } from "./transaction.queries";
+import { assertOnline } from "@/lib/offline-guard";
```

**Edit 2 — addTransaction**: Convert arrow shorthand to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: async (data: CreateTransactionInput) =>
-      await transactionController.addTransaction({ data }),
+    mutationFn: async (data: CreateTransactionInput) => {
+      assertOnline();
+      return await transactionController.addTransaction({ data });
+    },
     onSuccess: () => {
       qc.invalidateQueries({
         queryKey: [QUERY_KEY],
       });
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

**Edit 3 — updateTransaction**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: (data: UpdateTransactionDTO) =>
-      transactionController.updateTransaction({ data }),
+    mutationFn: async (data: UpdateTransactionDTO) => {
+      assertOnline();
+      return await transactionController.updateTransaction({ data });
+    },
     onSuccess: (data) => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

**Edit 4 — deleteTransaction**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: (data: { id: string }) =>
-      transactionController.deleteTransaction({ data }),
+    mutationFn: async (data: { id: string }) => {
+      assertOnline();
+      return await transactionController.deleteTransaction({ data });
+    },
     onSuccess: () => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

### File 2: `src/features/products/product.mutations.ts`

**Edit 1 — Add imports** (after line 1):

```diff
 import { useMutation, useQueryClient } from "@tanstack/react-query";
+import { toast } from "sonner";
 import {
   CreateProductDTO,
   UpdateProductDTO,
   productController,
 } from "./product.controller";
 import { PRODUCT_QUERY_KEY } from "./product.queries";
+import { assertOnline } from "@/lib/offline-guard";
```

**Edit 2 — createProduct**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: (data: CreateProductDTO) =>
-      productController.createProduct({ data }),
+    mutationFn: async (data: CreateProductDTO) => {
+      assertOnline();
+      return await productController.createProduct({ data });
+    },
     onSuccess: () => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

**Edit 3 — updateProduct**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: (data: UpdateProductDTO) =>
-      productController.updateProduct({ data }),
+    mutationFn: async (data: UpdateProductDTO) => {
+      assertOnline();
+      return await productController.updateProduct({ data });
+    },
     onSuccess: (data) => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

**Edit 4 — deleteProduct**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: (data: { productId: string }) =>
-      productController.deleteProduct({ data }),
+    mutationFn: async (data: { productId: string }) => {
+      assertOnline();
+      return await productController.deleteProduct({ data });
+    },
     onSuccess: (_, variables) => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

### File 3: `src/features/recurring/recurring.mutations.ts`

**Edit 1 — Add imports** (after line 1):

```diff
 import { useMutation, useQueryClient } from "@tanstack/react-query";
+import { toast } from "sonner";
 import {
   NewRecurringProductDTO,
   recurringController,
   UpdateReucrringProductDTO,
 } from "./recurring.controller";
 import { RECURRING_QUERY_KEY } from "./recurring.queries";
+import { assertOnline } from "@/lib/offline-guard";
```

**Edit 2 — addRecurringProduct**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: (data: NewRecurringProductDTO) =>
-      recurringController.addRecurringProduct({ data }),
+    mutationFn: async (data: NewRecurringProductDTO) => {
+      assertOnline();
+      return await recurringController.addRecurringProduct({ data });
+    },
     onSuccess: () => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

**Edit 3 — updateRecurringProduct**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: (data: UpdateReucrringProductDTO) =>
-      recurringController.updateRecurringProduct({ data }),
+    mutationFn: async (data: UpdateReucrringProductDTO) => {
+      assertOnline();
+      return await recurringController.updateRecurringProduct({ data });
+    },
     onSuccess: () => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

**Edit 4 — deleteRecurringProduct**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: (data: { id: string }) =>
-      recurringController.deleteRecurringProduct({ data }),
+    mutationFn: async (data: { id: string }) => {
+      assertOnline();
+      return await recurringController.deleteRecurringProduct({ data });
+    },
     onSuccess: () => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

### File 4: `src/features/tags/tag.mutations.ts`

**Edit 1 — Add imports** (after line 1):

```diff
 import { useMutation, useQueryClient } from "@tanstack/react-query";
+import { toast } from "sonner";
 import { tagController } from "./tag.controller";
 import { TAG_QUERY_KEY } from "./tag.queries";
 import { PRODUCT_QUERY_KEY } from "../products/product.queries";
+import { assertOnline } from "@/lib/offline-guard";
```

**Edit 2 — addTag**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: async (data: { name: string; color?: string }) =>
-      await tagController.addTag({ data }),
+    mutationFn: async (data: { name: string; color?: string }) => {
+      assertOnline();
+      return await tagController.addTag({ data });
+    },
     onSuccess: () => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

**Edit 3 — linkTagToProduct**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: async (data: { tagId: string; productId: string }) =>
-      await tagController.linkTagToProduct({ data }),
+    mutationFn: async (data: { tagId: string; productId: string }) => {
+      assertOnline();
+      return await tagController.linkTagToProduct({ data });
+    },
     onSuccess: () => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

**Edit 4 — unlinkTagFromProduct**: Convert to block body with `assertOnline()`, add `onError`:

```diff
   return useMutation({
-    mutationFn: async (data: { tagId: string; productId: string }) =>
-      await tagController.unlinkTagFromProduct({ data }),
+    mutationFn: async (data: { tagId: string; productId: string }) => {
+      assertOnline();
+      return await tagController.unlinkTagFromProduct({ data });
+    },
     onSuccess: () => {
       // ... existing onSuccess unchanged ...
     },
+    onError: (error) => {
+      toast.error(error.message);
+    },
   });
```

### Verification

**Step 1: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new TypeScript errors from the mutation files.

**Step 2: Run all existing tests to verify nothing is broken**

Run: `npm test`
Expected: All existing tests pass.

**Step 3: Verify offline mutation guard works in browser**

Run: `npm run dev`

1. Open `http://localhost:3000/dashboard`
2. Open DevTools → Network → check "Offline"
3. Try to create/edit/delete a transaction
4. Expected: a toast error appears saying "You're offline. Please reconnect to save changes."
5. Uncheck "Offline" → mutation should work normally

Press `Ctrl+C` to stop the dev server.

**Step 4: Commit**

```bash
git add src/features/transactions/transaction.mutations.ts src/features/products/product.mutations.ts src/features/recurring/recurring.mutations.ts src/features/tags/tag.mutations.ts
git commit -m "feat(pwa): add offline mutation guards to all mutation hooks"
```

**Done when:** All mutations throw an `OfflineError` with toast when attempted offline, and work normally when online. All existing tests pass.
