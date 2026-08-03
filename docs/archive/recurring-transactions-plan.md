# Recurring Transactions — Implementation Plan

## Overview

Add full CRUD for recurring transactions: schema update (soft delete), migration, repo, service, controller, DTOs, queries, mutations, and frontend UI pages. Follows the exact patterns established by `products` and `transactions` features.

**Key design constraint:** The `recurring` table has no `userId` column. Ownership is determined through `recurring.productId → products.userId`. All auth checks must JOIN through the product to verify the requesting user owns the resource.

---

## Step 1: Update Schema — Add `deletedAt` field

**File:** `src/features/recurring/recurring.schema.ts`

Add `deletedAt` column to the `recurring` table:

```ts
import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "../products/products.schema";
import { entryType } from "../transactions/transactions.schema";

export const recurringInterval = pgEnum("recurring_interval", [
  "weekly",
  "monthly",
  "yearly",
]);

export const recurring = pgTable("recurring", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  interval: recurringInterval().notNull(),
  type: entryType().notNull(),
  start: timestamp("start").notNull(),
  end: timestamp("end"),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),  // <-- NEW
});
```

---

## Step 2: Generate Drizzle Migration

Run:

```bash
npm run db:generate
```

This will auto-generate a migration file in `drizzle/<timestamp>_<name>/migration.sql` containing:

```sql
ALTER TABLE "recurring" ADD COLUMN "deleted_at" timestamp;
```

Then apply it:

```bash
npm run db:migrate
```

---

## Step 3: Create Models

**New file:** `src/features/recurring/recurring.models.ts`

```ts
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { recurring } from "./recurring.schema";
import { Product } from "../products/products.models";

export const recurringIntervals = ["weekly", "monthly", "yearly"] as const;
export type RecurringInterval = (typeof recurringIntervals)[number];

export type Recurring = InferSelectModel<typeof recurring>;
export type RecurringWithProduct = Recurring & { products: Product | null };
export type NewRecurring = InferInsertModel<typeof recurring>;
export type UpdateRecurring = Partial<
  Omit<NewRecurring, "id" | "createdAt" | "updatedAt" | "deletedAt">
>;
```

---

## Step 4: Create DTOs (Validation Schemas)

**New file:** `src/features/recurring/recurring.dtos.ts`

```ts
import z from "zod";
import { recurringIntervals } from "./recurring.models";
import { entryTypes } from "../transactions/transactions.models";
import { positiveNumberValidator } from "@/validators";

export const getRecurringSchema = z.object({
  recurringId: z.string(),
});

export type GetRecurringDTO = z.infer<typeof getRecurringSchema>;

export const createRecurringSchema = z.object({
  productId: z.string(),
  price: positiveNumberValidator,
  interval: z.enum(recurringIntervals),
  type: z.enum(entryTypes),
  start: z.date(),
  end: z.date().optional(),
  isActive: z.boolean(),
});

export type CreateRecurringDTO = z.infer<typeof createRecurringSchema>;

export const updateRecurringSchema = z.object({
  recurringId: z.string(),
  productId: z.string().optional(),
  price: positiveNumberValidator.optional(),
  interval: z.enum(recurringIntervals).optional(),
  type: z.enum(entryTypes).optional(),
  start: z.date().optional(),
  end: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRecurringDTO = z.infer<typeof updateRecurringSchema>;

export const deleteRecurringSchema = z.object({
  recurringId: z.string(),
});

export type DeleteRecurringDTO = z.infer<typeof deleteRecurringSchema>;
```

---

## Step 5: Create Repository

**New file:** `src/features/recurring/recurring.repo.ts`

Pattern: follows `src/features/products/products.repo.ts:6-16` (query style) and `src/features/products/products.repo.ts:45-51` (soft delete).

**Critical change from original plan:** `getAll` now accepts `userId` and filters through the product relation.

```ts
import { db } from "@/lib/db";
import { recurring } from "@/lib/db/schema";
import { products } from "@/features/products/products.schema";
import { NewRecurring, UpdateRecurring } from "./recurring.models";
import { and, eq, isNull } from "drizzle-orm";

async function getAll(userId: string) {
  return await db.query.recurring.findMany({
    with: {
      products: true,
    },
    where: and(
      isNull(recurring.deletedAt),
      eq(products.userId, userId),
    ),
  });
}

async function getOne(id: string) {
  return await db.query.recurring.findFirst({
    with: {
      products: true,
    },
    where: {
      id,
    },
  });
}

async function save(data: NewRecurring) {
  return await db.insert(recurring).values(data).returning();
}

async function update(id: string, data: UpdateRecurring) {
  return await db
    .update(recurring)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(recurring.id, id))
    .returning();
}

async function softDelete(id: string) {
  return await db
    .update(recurring)
    .set({ deletedAt: new Date() })
    .where(eq(recurring.id, id))
    .returning();
}

export const recurringRepo = {
  getAll,
  getOne,
  save,
  update,
  softDelete,
};
```

**Key notes:**
- `getAll(userId)` filters by `deletedAt IS NULL` AND joins through `products.userId` to scope to the requesting user
- `getOne` eagerly loads `products: true` so the service layer can check `item.products.userId` for ownership
- The Drizzle relational query `where` with `and(...)` + column refs may need adjustment depending on exact Drizzle version. If the relational query API doesn't support cross-table filtering in `where`, use a raw SQL query with `db.select().from(recurring).innerJoin(products, eq(recurring.productId, products.id)).where(and(eq(products.userId, userId), isNull(recurring.deletedAt)))` instead. Test this during implementation.

---

## Step 6: Create Service (with Auth Checks)

**New file:** `src/features/recurring/recurring.service.ts`

Pattern: follows `src/features/products/products.service.ts` — uses `ok()`/`err()` result pattern from `src/utils/result.ts:1-11`.

**Critical change from original plan:** Every operation now accepts `userId` and verifies ownership through the product relation. The pattern mirrors `src/features/products/products.service.ts:18-42` where `getProduct` checks `product.userId !== userId`.

```ts
import { err, ok } from "@/utils/result";
import { recurringRepo } from "./recurring.repo";
import { NewRecurring, Recurring, UpdateRecurring } from "./recurring.models";
import { productService } from "../products/products.service";

async function getRecurrings(userId: string) {
  try {
    const items = await recurringRepo.getAll(userId);
    return ok(items);
  } catch (error) {
    return err({
      reason: "RECURRING_DB_ERROR",
      message: "Failed to fetch recurring transactions",
    });
  }
}

async function getRecurring(userId: string, recurringId: string) {
  try {
    const item = await recurringRepo.getOne(recurringId);
    if (!item) {
      return err({
        reason: "RECURRING_NOT_FOUND",
        message: `Recurring transaction with id ${recurringId} not found`,
      });
    }

    if (item.deletedAt) {
      return err({
        reason: "RECURRING_NOT_FOUND",
        message: `Recurring transaction with id ${recurringId} not found`,
      });
    }

    // Auth check: verify ownership via product → userId
    if (!item.products || item.products.userId !== userId) {
      return err({
        reason: "RECURRING_UNAUTHORIZED",
        message: `User ${userId} does not have access to recurring transaction ${recurringId}`,
      });
    }

    return ok(item);
  } catch (error) {
    return err({
      reason: "RECURRING_DB_ERROR",
      message: `Failed to fetch recurring transaction (${recurringId})`,
    });
  }
}

async function createRecurring(userId: string, data: Omit<NewRecurring, "isActive"> & { isActive: boolean }) {
  // Auth check: verify the user owns the product they're attaching this to
  const [productError] = await productService.getProduct(userId, data.productId);
  if (productError) {
    return err({
      reason: "RECURRING_UNAUTHORIZED",
      message: `User ${userId} does not own product ${data.productId}`,
    });
  }

  try {
    const res = await recurringRepo.save(data);
    if (res.length === 0) {
      return err({
        reason: "RECURRING_NOT_RETURNED",
        message: "No recurring transaction returned after saving",
      });
    }
    return ok(res[0]);
  } catch (error) {
    return err({
      reason: "RECURRING_DB_ERROR",
      message: "Failed to save recurring transaction",
    });
  }
}

async function updateRecurring(userId: string, recurringId: string, data: UpdateRecurring) {
  // Auth check: getRecurring verifies ownership
  const [foundError] = await getRecurring(userId, recurringId);
  if (foundError) {
    return err(foundError);
  }

  // If changing productId, verify user owns the new product too
  if (data.productId) {
    const [productError] = await productService.getProduct(userId, data.productId);
    if (productError) {
      return err({
        reason: "RECURRING_UNAUTHORIZED",
        message: `User ${userId} does not own product ${data.productId}`,
      });
    }
  }

  try {
    const res = await recurringRepo.update(recurringId, data);
    if (res.length === 0) {
      return err({
        reason: "RECURRING_UPDATE_FAILED",
        message: "Failed to update recurring transaction. No row returned",
      });
    }
    return ok(res[0]);
  } catch (error) {
    return err({
      reason: "RECURRING_DB_ERROR",
      message: `Failed to update recurring transaction (${recurringId})`,
    });
  }
}

async function deleteRecurring(userId: string, recurringId: string) {
  // Auth check: getRecurring verifies ownership
  const [foundError] = await getRecurring(userId, recurringId);
  if (foundError) {
    return err(foundError);
  }

  try {
    const res = await recurringRepo.softDelete(recurringId);
    if (res.length === 0) {
      return err({
        reason: "RECURRING_DELETE_FAILED",
        message: "Failed to delete recurring transaction. No row returned",
      });
    }
    return ok(res[0]);
  } catch (error) {
    return err({
      reason: "RECURRING_DB_ERROR",
      message: `Failed to delete recurring transaction (${recurringId})`,
    });
  }
}

export const recurringService = {
  getRecurrings,
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
};
```

**Auth check summary:**
| Operation | How ownership is verified |
|---|---|
| `getRecurrings(userId)` | Repo filters by `products.userId` in the query |
| `getRecurring(userId, id)` | Loads item with product, checks `item.products.userId !== userId` |
| `createRecurring(userId, data)` | Calls `productService.getProduct(userId, data.productId)` which checks ownership (see `src/features/products/products.service.ts:28`) |
| `updateRecurring(userId, id, data)` | Calls `getRecurring` (ownership check) + if changing `productId`, verifies new product ownership |
| `deleteRecurring(userId, id)` | Calls `getRecurring` (ownership check) |

---

## Step 7: Create Controller

**New file:** `src/features/recurring/recurring.controller.ts`

Pattern: follows `src/features/products/products.controller.ts` — uses `createServerFn` from `@tanstack/react-start` with `authenticated` middleware. **All handlers now pass `context.user.id`** to the service layer, matching the pattern in `src/features/transactions/transactions.controller.ts:15-18`.

```ts
import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { recurringService } from "./recurring.service";
import {
  createRecurringSchema,
  deleteRecurringSchema,
  getRecurringSchema,
  updateRecurringSchema,
} from "./recurring.dtos";

const getRecurrings = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await recurringService.getRecurrings(userId);
  });

const getRecurring = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getRecurringSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { recurringId } = data;
    return await recurringService.getRecurring(userId, recurringId);
  });

const createRecurring = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(createRecurringSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await recurringService.createRecurring(userId, {
      productId: data.productId,
      price: data.price,
      interval: data.interval,
      type: data.type,
      start: data.start,
      end: data.end,
      isActive: data.isActive,
    });
  });

const updateRecurring = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(updateRecurringSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { recurringId, ...updateData } = data;
    return await recurringService.updateRecurring(userId, recurringId, updateData);
  });

const deleteRecurring = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(deleteRecurringSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { recurringId } = data;
    return await recurringService.deleteRecurring(userId, recurringId);
  });

export const recurringController = {
  getRecurrings,
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
};
```

---

## Step 8: Create React Query Hooks

### Queries

**New file:** `src/features/recurring/recurring.queries.ts`

```ts
import { queryOptions } from "@tanstack/react-query";
import { recurringController } from "./recurring.controller";

export const RECURRING_QUERY_KEY = "recurring";

function getRecurringsOptions() {
  return queryOptions({
    queryKey: [RECURRING_QUERY_KEY],
    queryFn: recurringController.getRecurrings,
  });
}

function getRecurringOptions(recurringId: string) {
  return queryOptions({
    queryKey: [RECURRING_QUERY_KEY, recurringId],
    queryFn: () =>
      recurringController.getRecurring({ data: { recurringId } }),
  });
}

export const recurringQueries = {
  getRecurringsOptions,
  getRecurringOptions,
};
```

### Mutations

**New file:** `src/features/recurring/recurring.mutations.ts`

```ts
import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateRecurringDTO,
  DeleteRecurringDTO,
  UpdateRecurringDTO,
} from "./recurring.dtos";
import { recurringController } from "./recurring.controller";
import { RECURRING_QUERY_KEY } from "./recurring.queries";
import { toast } from "sonner";

function createRecurring() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRecurringDTO) => {
      assertOnline();
      return await recurringController.createRecurring({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to create recurring transaction. Please try again!");
    },
  });
}

function updateRecurring() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRecurringDTO) => {
      assertOnline();
      return await recurringController.updateRecurring({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to update recurring transaction. Please try again!");
    },
  });
}

function deleteRecurring() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteRecurringDTO) => {
      assertOnline();
      return await recurringController.deleteRecurring({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to delete recurring transaction. Please try again!");
    },
  });
}

export const recurringMutations = {
  createRecurring,
  updateRecurring,
  deleteRecurring,
};
```

---

## Step 9: Create Frontend Validators

**New file:** `src/features/recurring/recurring.validators.ts`

Client-side form validation schema (mirrors `src/features/products/products.validators.ts`). This is separate from the DTOs — DTOs validate server function input, validators validate form input.

```ts
import { positiveNumberValidator } from "@/validators";
import { recurringIntervals } from "./recurring.models";
import { entryTypes } from "../transactions/transactions.models";
import z from "zod";

export const recurringFormSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  price: positiveNumberValidator,
  interval: z.enum(recurringIntervals, { required_error: "Interval is required" }),
  type: z.enum(entryTypes, { required_error: "Type is required" }),
  start: z.date({ required_error: "Start date is required" }),
  end: z.date().optional(),
  isActive: z.boolean(),
});

export type RecurringFormValues = z.infer<typeof recurringFormSchema>;
```

---

## Step 10: Create Frontend Components

All components go in `src/features/recurring/components/`. Follow the exact patterns from `src/features/products/components/`.

### 10a: Recurring List Component

**New file:** `src/features/recurring/components/recurring-list.tsx`

Pattern: mirrors `src/features/products/components/product-list.tsx` — compound component with `RecurringList`, `RecurringListTitle`, `RecurringListEmpty`.

```tsx
import { Link } from "@tanstack/react-router";
import { RecurringWithProduct } from "../recurring.models";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { ChevronRight, Repeat } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";

function RecurringList({
  items,
  children,
}: {
  items: RecurringWithProduct[];
  children: React.ReactNode;
}) {
  const hasItems = items.length > 0;

  const title = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === RecurringListTitle,
  );

  const emptyMessage = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === RecurringListEmpty,
  );

  return (
    <div className="space-y-2">
      {title}
      {hasItems ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {items.map((item, idx) => (
            <Link
              key={item.id}
              to="/dashboard/recurring/$id"
              params={{ id: item.id }}
              className="block"
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${idx !== items.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="size-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <Repeat className="size-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.products?.name ?? "Unknown product"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>${item.price}/{item.interval}</span>
                    <Badge variant={item.type === "expense" ? "destructive" : "default"} className="text-[10px] px-1.5 py-0">
                      {item.type}
                    </Badge>
                  </div>
                </div>
                <Badge variant={item.isActive ? "default" : "secondary"} className="text-[10px]">
                  {item.isActive ? "Active" : "Paused"}
                </Badge>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        emptyMessage
      )}
    </div>
  );
}

function RecurringListTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function RecurringListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState icon={Repeat}>
      <EmptyStateMessage>{children}</EmptyStateMessage>
    </EmptyState>
  );
}

export { RecurringList, RecurringListTitle, RecurringListEmpty };
```

### 10b: New Recurring Form

**New file:** `src/features/recurring/components/new-recurring.form.tsx`

Pattern: mirrors `src/features/products/components/new-product.form.tsx` — uses `react-hook-form` + `zodResolver` + mutation hook + `toast` + `useNavigate`.

```tsx
import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { recurringMutations } from "../recurring.mutations";
import { recurringFormSchema, RecurringFormValues } from "../recurring.validators";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { LoaderButton } from "@/components/custom/loader.button";
import { ProductSelect } from "@/components/custom/product-select";
import { Checkbox } from "@/components/ui/checkbox";

export function NewRecurringForm() {
  const navigate = useNavigate();
  const mutation = recurringMutations.createRecurring();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      isActive: true,
      type: "expense",
      interval: "monthly",
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: (res) => {
        const [error] = res;
        if (error) {
          let message: string;
          const reason = error.reason;
          switch (reason) {
            case "RECURRING_UNAUTHORIZED":
              message = "You do not have permission to create this recurring transaction";
              break;
            case "RECURRING_NOT_RETURNED":
            case "RECURRING_DB_ERROR":
              message = "Failed to save recurring transaction. Please try again!";
              break;
            default:
              message = `Unexpected error: ${reason satisfies never}`;
          }
          toast.error(message);
        } else {
          navigate({ to: "/dashboard/recurring" });
        }
      },
    });
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="space-y-6">
        <FormField>
          <FormFieldLabel required>Product</FormFieldLabel>
          <Controller
            name="productId"
            control={control}
            render={({ field }) => (
              <ProductSelect value={field.value} onChange={field.onChange} />
            )}
          />
          <FormFieldError>{errors.productId?.message}</FormFieldError>
        </FormField>

        <FormField>
          <FormFieldLabel required>Price</FormFieldLabel>
          <Input {...register("price")} placeholder="9.99" />
          <FormFieldError>{errors.price?.message}</FormFieldError>
        </FormField>

        <FormField>
          <FormFieldLabel required>Interval</FormFieldLabel>
          <Controller
            name="interval"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                {/* Use the project's Select component — render options for "weekly", "monthly", "yearly" */}
                {/* Implementation depends on exact Select API from src/components/ui/select.tsx */}
              </Select>
            )}
          />
          <FormFieldError>{errors.interval?.message}</FormFieldError>
        </FormField>

        <FormField>
          <FormFieldLabel required>Type</FormFieldLabel>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                {/* Options: "expense", "income" */}
              </Select>
            )}
          />
          <FormFieldError>{errors.type?.message}</FormFieldError>
        </FormField>

        <FormField>
          <FormFieldLabel required>Start Date</FormFieldLabel>
          {/* Use the project's Calendar/DatePicker from src/components/ui/calendar.tsx */}
          <Controller
            name="start"
            control={control}
            render={({ field }) => (
              {/* DatePicker component — check how transactions use date picking */}
            )}
          />
          <FormFieldError>{errors.start?.message}</FormFieldError>
        </FormField>

        <FormField>
          <FormFieldLabel>End Date (optional)</FormFieldLabel>
          <Controller
            name="end"
            control={control}
            render={({ field }) => (
              {/* DatePicker component */}
            )}
          />
          <FormFieldError>{errors.end?.message}</FormFieldError>
        </FormField>

        <FormField>
          <div className="flex items-center gap-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <FormFieldLabel>Active</FormFieldLabel>
          </div>
        </FormField>

        <LoaderButton
          type="submit"
          size="sm"
          isLoading={mutation.isPending}
          disabled={mutation.isPending}
          className="w-full"
        >
          Create recurring transaction
        </LoaderButton>
      </div>
    </Form>
  );
}
```

**Implementation note:** The exact `Select`, `DatePicker`, and `ProductSelect` component APIs should be verified against the actual component files during implementation. The `ProductSelect` component already exists at `src/components/custom/product-select.tsx`. Check `src/components/ui/select.tsx` and `src/components/ui/calendar.tsx` for the exact prop interfaces.

### 10c: Edit Recurring Form

**New file:** `src/features/recurring/components/edit-recurring.form.tsx`

Pattern: mirrors `src/features/products/components/edit-product.form.tsx` — wrapped in `Card`, uses `defaultValues` from existing data, `isDirty` to disable submit.

```tsx
import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { recurringFormSchema, RecurringFormValues } from "../recurring.validators";
import { RecurringWithProduct } from "../recurring.models";
import { LoaderButton } from "@/components/custom/loader.button";
import { recurringMutations } from "../recurring.mutations";
import { toast } from "sonner";
import { ProductSelect } from "@/components/custom/product-select";
import { Checkbox } from "@/components/ui/checkbox";

export function EditRecurringForm({ recurring }: { recurring: RecurringWithProduct }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      productId: recurring.productId,
      price: recurring.price,
      interval: recurring.interval,
      type: recurring.type,
      start: new Date(recurring.start),
      end: recurring.end ? new Date(recurring.end) : undefined,
      isActive: recurring.isActive,
    },
  });

  const mutation = recurringMutations.updateRecurring();

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(
      { recurringId: recurring.id, ...data },
      {
        onSuccess: (res) => {
          const [error] = res;
          if (error) {
            let message: string;
            const reason = error.reason;
            switch (reason) {
              case "RECURRING_NOT_FOUND":
                message = "Recurring transaction not found";
                break;
              case "RECURRING_UNAUTHORIZED":
                message = "You do not have permission to update this";
                break;
              case "RECURRING_UPDATE_FAILED":
              case "RECURRING_DB_ERROR":
                message = "Failed to update. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}. Please try again!`;
            }
            toast.error(message);
          } else {
            toast.success("Recurring transaction updated!");
          }
        },
      },
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Recurring transaction details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={onSubmit}>
          {/* Same fields as NewRecurringForm — productId, price, interval, type, start, end, isActive */}
          {/* Use the same FormField pattern but with defaultValues pre-filled */}
          <div className="space-y-6">
            <FormField>
              <FormFieldLabel required>Product</FormFieldLabel>
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <ProductSelect value={field.value} onChange={field.onChange} />
                )}
              />
              <FormFieldError>{errors.productId?.message}</FormFieldError>
            </FormField>

            <FormField>
              <FormFieldLabel required>Price</FormFieldLabel>
              <Input {...register("price")} placeholder="9.99" />
              <FormFieldError>{errors.price?.message}</FormFieldError>
            </FormField>

            {/* interval, type, start, end, isActive fields — same as new-recurring.form.tsx */}

            <LoaderButton
              type="submit"
              size="sm"
              isLoading={mutation.isPending}
              disabled={!isDirty || mutation.isPending}
              className="w-full mt-2"
            >
              Save changes
            </LoaderButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
```

### 10d: Delete Recurring Dialog

**New file:** `src/features/recurring/components/delete-recurring.dialog.tsx`

Pattern: exact copy of `src/features/products/components/delete-product.dialog.tsx` with recurring-specific text and mutation.

```tsx
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";
import { recurringMutations } from "../recurring.mutations";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function DeleteRecurringDialog({
  recurringId,
  children,
}: {
  recurringId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const mutation = recurringMutations.deleteRecurring();

  function handleDelete() {
    mutation.mutate(
      { recurringId },
      {
        onSuccess: (res) => {
          const [err] = res;
          if (err) {
            let message: string;
            const reason = err.reason;
            switch (reason) {
              case "RECURRING_NOT_FOUND":
                message = "Recurring transaction was not found";
                break;
              case "RECURRING_UNAUTHORIZED":
                message = "You do not have permission to delete this";
                break;
              case "RECURRING_DELETE_FAILED":
              case "RECURRING_DB_ERROR":
                message = "Failed to delete. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}. Please try again!`;
            }
            toast.error(message);
          } else {
            toast.success("Recurring transaction deleted!");
            setOpen(false);
            navigate({ to: "/dashboard/recurring" });
          }
        },
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <AlertDialogTitle>Delete recurring transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            This recurring transaction will be archived. It will no longer appear
            in your recurring list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoaderButton
            variant="destructive"
            size="sm"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
            onClick={handleDelete}
          >
            Delete
          </LoaderButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Step 11: Update Route Pages

The route files already exist as placeholder stubs. Update them with real content.

### 11a: List Page

**Edit file:** `src/routes/_app/dashboard/recurring/index.tsx`

Pattern: mirrors `src/routes/_app/dashboard/products/index.tsx` — `loader` prefetches, `useSuspenseQuery` in content, error handling with `ExpectedError`/`UnexpectedError`, KPI cards, list component.

```tsx
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { SkeletonList } from "@/components/custom/skeletons/skeleton-list";
import { SkeletonCard } from "@/components/custom/skeletons/skeleton-card";
import { Button } from "@/components/ui/button";
import {
  RecurringList,
  RecurringListEmpty,
  RecurringListTitle,
} from "@/features/recurring/components/recurring-list";
import { RecurringWithProduct } from "@/features/recurring/recurring.models";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Repeat, Plus, Pause, Play } from "lucide-react";
import { Suspense, useMemo } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      recurringQueries.getRecurringsOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Recurring</PageHeaderTitle>
        <PageHeaderDescription>
          Track recurring expenses and subscriptions
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/recurring/new">
              <Plus className="size-4" />
              <span className="max-md:sr-only">New recurring</span>
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <Suspense fallback={<RecurringContentSkeleton />}>
        <RecurringContent />
      </Suspense>
    </div>
  );
}

function RecurringContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonList rows={6} />
    </div>
  );
}

function RecurringContent() {
  const {
    data: [expectedError, items],
    error: unexpectedError,
  } = useSuspenseQuery(recurringQueries.getRecurringsOptions());

  const { activeItems, pausedItems } = useMemo(() => {
    if (!items) return { activeItems: [], pausedItems: [] };

    const activeItems: RecurringWithProduct[] = [];
    const pausedItems: RecurringWithProduct[] = [];

    items.forEach((item) => {
      if (item.isActive) {
        activeItems.push(item);
      } else {
        pausedItems.push(item);
      }
    });

    return { activeItems, pausedItems };
  }, [items]);

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "RECURRING_DB_ERROR":
        title = "Database error";
        message = "Something went wrong trying to fetch your recurring transactions. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
        break;
    }
    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <div className="space-y-6 @container">
      <div className="grid gap-3 @lg:grid-cols-2 @xl:grid-cols-3">
        <div className="@lg:col-span-2 @xl:col-span-1">
          <KpiCard
            title="Total"
            value={`${items.length}`}
            subtitle="All recurring"
            icon={Repeat}
          />
        </div>
        <KpiCard
          title="Active"
          value={`${activeItems.length}`}
          subtitle="Currently running"
          icon={Play}
        />
        <KpiCard
          title="Paused"
          value={`${pausedItems.length}`}
          subtitle="Currently paused"
          icon={Pause}
        />
      </div>
      <RecurringList items={activeItems}>
        <RecurringListTitle>Active</RecurringListTitle>
        <RecurringListEmpty>No active recurring transactions</RecurringListEmpty>
      </RecurringList>
      <RecurringList items={pausedItems}>
        <RecurringListTitle>Paused</RecurringListTitle>
        <RecurringListEmpty>No paused recurring transactions</RecurringListEmpty>
      </RecurringList>
    </div>
  );
}
```

### 11b: Detail/Edit Page

**Edit file:** `src/routes/_app/dashboard/recurring/$id.tsx`

Pattern: mirrors `src/routes/_app/dashboard/products/$productId.tsx` — loader prefetches by param, `useSuspenseQuery`, error switch, edit form + delete dialog.

```tsx
import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { EditRecurringForm } from "@/features/recurring/components/edit-recurring.form";
import { DeleteRecurringDialog } from "@/features/recurring/components/delete-recurring.dialog";
import { recurringQueries } from "@/features/recurring/recurring.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/$id")({
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringOptions(params.id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Recurring Details</PageHeaderTitle>
        <PageHeaderDescription>
          View and manage this recurring transaction
        </PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={6} />}>
        <EditRecurringContent />
      </Suspense>
    </div>
  );
}

function EditRecurringContent() {
  const { id } = Route.useParams();
  const {
    data: [expectedError, recurring],
    error: unexpectedError,
  } = useSuspenseQuery(recurringQueries.getRecurringOptions(id));

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "RECURRING_NOT_FOUND":
        title = "Not found";
        message = "Recurring transaction not found. Make sure the URL is correct.";
        break;
      case "RECURRING_UNAUTHORIZED":
        title = "Unauthorized";
        message = "You do not have permission to view this recurring transaction!";
        break;
      case "RECURRING_DB_ERROR":
        title = "Database error";
        message = "Something went wrong. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
        break;
    }

    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <div className="space-y-8">
      <EditRecurringForm recurring={recurring} />
      <div className="pt-4 border-t border-border">
        <DeleteRecurringDialog recurringId={recurring.id}>
          Delete recurring transaction
        </DeleteRecurringDialog>
      </div>
    </div>
  );
}
```

### 11c: New Page

**Edit file:** `src/routes/_app/dashboard/recurring/new.tsx`

Pattern: mirrors `src/routes/_app/dashboard/products/new.tsx`.

```tsx
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { NewRecurringForm } from "@/features/recurring/components/new-recurring.form";
import { productQueries } from "@/features/products/products.queries";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/recurring/new")({
  loader: async ({ context }) => {
    // Prefetch products so the ProductSelect dropdown is ready
    await context.queryClient.ensureQueryData(productQueries.getProductsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>New Recurring</PageHeaderTitle>
        <PageHeaderDescription>
          Set up a new recurring transaction
        </PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={6} />}>
        <NewRecurringForm />
      </Suspense>
    </div>
  );
}
```

---

## Step 12: No Barrel/Index Updates Needed

- `src/lib/db/schema.ts` already re-exports `recurring.schema.ts` (line 3: `export * from "@/features/recurring/recurring.schema"`)
- `src/lib/db/relations.ts` already defines the `recurring ↔ products` relation (lines 72-76)
- Route files already exist at `src/routes/_app/dashboard/recurring/` — TanStack Router auto-discovers them
- No route registration files exist — TanStack Start uses `createServerFn` which auto-registers as RPC endpoints

---

## File Checklist

| #  | File | Action |
|----|------|--------|
| 1  | `src/features/recurring/recurring.schema.ts` | **Edit** — add `deletedAt` column |
| 2  | `drizzle/<auto>/migration.sql` | **Generate** — `npm run db:generate` then `npm run db:migrate` |
| 3  | `src/features/recurring/recurring.models.ts` | **Create** — type definitions incl. `RecurringWithProduct` |
| 4  | `src/features/recurring/recurring.dtos.ts` | **Create** — Zod validation schemas for server functions |
| 5  | `src/features/recurring/recurring.repo.ts` | **Create** — DB queries with userId filtering |
| 6  | `src/features/recurring/recurring.service.ts` | **Create** — business logic with auth checks |
| 7  | `src/features/recurring/recurring.controller.ts` | **Create** — server functions passing userId |
| 8  | `src/features/recurring/recurring.queries.ts` | **Create** — React Query options |
| 9  | `src/features/recurring/recurring.mutations.ts` | **Create** — React Query mutations |
| 10 | `src/features/recurring/recurring.validators.ts` | **Create** — client-side form validation |
| 11 | `src/features/recurring/components/recurring-list.tsx` | **Create** — list compound component |
| 12 | `src/features/recurring/components/new-recurring.form.tsx` | **Create** — create form |
| 13 | `src/features/recurring/components/edit-recurring.form.tsx` | **Create** — edit form |
| 14 | `src/features/recurring/components/delete-recurring.dialog.tsx` | **Create** — delete confirmation dialog |
| 15 | `src/routes/_app/dashboard/recurring/index.tsx` | **Edit** — replace stub with list page |
| 16 | `src/routes/_app/dashboard/recurring/$id.tsx` | **Edit** — replace stub with detail/edit page |
| 17 | `src/routes/_app/dashboard/recurring/new.tsx` | **Edit** — replace stub with create page |

---

## Implementation Order

Execute in this exact order (each step depends on the previous):

1. **Schema update** (`recurring.schema.ts`) — add `deletedAt`
2. **Migration** — `npm run db:generate && npm run db:migrate`
3. **Models** (`recurring.models.ts`)
4. **DTOs** (`recurring.dtos.ts`)
5. **Validators** (`recurring.validators.ts`)
6. **Repository** (`recurring.repo.ts`)
7. **Service** (`recurring.service.ts`)
8. **Controller** (`recurring.controller.ts`)
9. **Queries** (`recurring.queries.ts`)
10. **Mutations** (`recurring.mutations.ts`)
11. **Components** — `recurring-list.tsx`, `new-recurring.form.tsx`, `edit-recurring.form.tsx`, `delete-recurring.dialog.tsx`
12. **Route pages** — update `index.tsx`, `$id.tsx`, `new.tsx`
