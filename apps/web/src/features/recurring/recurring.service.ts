import { err, ok } from "@/utils/result";
import { env } from "@/config/env";
import { recurringRepo } from "./recurring.repo";
import { NewRecurring, UpdateRecurring } from "./recurring.models";
import { productService } from "../products/products.service";
import { transactionService } from "../transactions/transactions.service";

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

async function createRecurring(
  userId: string,
  data: Omit<NewRecurring, "isActive" | "productId"> & {
    isActive: boolean;
    product: { id: string | null; name: string };
  },
) {
  const [productError, product] = await resolveProduct(userId, data.product);
  if (productError) {
    return err(productError);
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

async function updateRecurring(
  userId: string,
  recurringId: string,
  data: Omit<UpdateRecurring, "productId"> & {
    product?: { id: string | null; name: string };
  },
) {
  const [foundError] = await getRecurring(userId, recurringId);
  if (foundError) {
    return err(foundError);
  }

  let resolvedProductId: string | undefined;
  if (data.product) {
    const [productError, product] = await resolveProduct(userId, data.product);
    if (productError) {
      return err(productError);
    }
    resolvedProductId = product.id;
  }

  const { product: _, ...rest } = data;
  const updateData: UpdateRecurring = {
    ...rest,
    ...(resolvedProductId ? { productId: resolvedProductId } : {}),
  };

  try {
    const res = await recurringRepo.update(recurringId, updateData);
    if (res.length === 0) {
      return err({
        reason: "RECURRING_UPDATE_FAILED" as const,
        message: "Failed to update recurring transaction. No row returned",
      });
    }
    return ok(res[0]);
  } catch (error) {
    return err({
      reason: "RECURRING_DB_ERROR" as const,
      message: `Failed to update recurring transaction (${recurringId})`,
    });
  }
}

async function deleteRecurring(userId: string, recurringId: string) {
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

function toNoonUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0),
  );
}

function shouldFireOnDate(
  interval: "weekly" | "monthly" | "yearly",
  start: Date,
  today: Date,
): boolean {
  switch (interval) {
    case "weekly":
      return today.getUTCDay() === start.getUTCDay();

    case "monthly": {
      const startDay = start.getUTCDate();
      const todayDay = today.getUTCDate();
      const lastDayOfMonth = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
      ).getUTCDate();

      if (startDay > lastDayOfMonth) {
        return todayDay === lastDayOfMonth;
      }

      return todayDay === startDay;
    }

    case "yearly":
      return (
        today.getUTCMonth() === start.getUTCMonth() &&
        today.getUTCDate() === start.getUTCDate()
      );
  }
}

async function processRecurringJob(jobToken: string) {
  if (!env.RECURRING_JOB_TOKEN || jobToken !== env.RECURRING_JOB_TOKEN) {
    return err({
      reason: "JOB_UNAUTHORIZED" as const,
      message: "Unauthorized",
    });
  }

  try {
    const todayStart = toNoonUTC(new Date());
    const activeRecurring = await recurringRepo.getActiveRecurringForDate(todayStart);

    let created = 0;
    let skipped = 0;

    for (const row of activeRecurring) {
      const rec = row.recurring;

      if (!shouldFireOnDate(rec.interval, rec.start, todayStart)) {
        skipped++;
        continue;
      }

      const hasTransaction = await recurringRepo.hasTransactionForDate({
        userId: row.userId,
        productId: rec.productId,
        date: todayStart,
      });

      if (hasTransaction) {
        skipped++;
        continue;
      }

      const [saveError] = await transactionService.saveTransaction({
        transaction: {
          userId: row.userId,
          source: "recurring",
          store: row.productName,
          description: rec.interval,
          date: todayStart,
        },
        entries: [
          {
            product: {
              id: rec.productId,
              name: row.productName,
            },
            quantity: "1",
            price: String(Math.abs(Number(rec.price))),
            type: rec.type,
            tagIds: [],
          },
        ],
      });

      if (saveError) {
        return err({
          reason: "RECURRING_JOB_SAVE_FAILED" as const,
          message: `Failed to save recurring transaction for product ${row.productName}`,
        });
      }

      created++;
    }

    return ok({
      created,
      skipped,
      date: todayStart.toISOString().split("T")[0],
    });
  } catch (error) {
    return err({
      reason: "RECURRING_DB_ERROR" as const,
      message: "Failed to process recurring transactions",
    });
  }
}

export const recurringService = {
  getRecurrings,
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  processRecurringJob,
};
