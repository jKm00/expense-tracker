import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "@/features/auth/server/auth.utils";
import { recurringService } from "./recurring.service";
import {
  createRecurringSchema,
  deleteRecurringSchema,
  getRecurringSchema,
  processRecurringJobSchema,
  updateRecurringSchema,
} from "@/features/recurring/shared/recurring.dtos";

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
      product: data.product,
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

const processRecurringJob = createServerFn({ method: "POST" })
  .inputValidator(processRecurringJobSchema)
  .handler(async ({ data }) => {
    return await recurringService.processRecurringJob(data.jobToken);
  });

export const recurringController = {
  getRecurrings,
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  processRecurringJob,
};
