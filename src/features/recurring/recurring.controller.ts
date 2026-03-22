import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { recurringService } from "./recurring.service";
import z from "zod";

const getAllRecurringProducts = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await recurringService.getAllRecurringProducts(userId);
  });

const RecurringIdSchema = z.object({
  id: z.string(),
});

const getRecurringProduct = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(RecurringIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await recurringService.getRecurringProduct(userId, data.id);
  });

const NewRecurringProductSchema = z.object({
  productId: z.string(),
  price: z.number(),
  interval: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.date(),
  endDate: z.date().optional(),
});

export type NewRecurringProductDTO = z.infer<typeof NewRecurringProductSchema>;

const addRecurringProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(NewRecurringProductSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await recurringService.createRecurringProduct(userId, {
      ...data,
      price: `${data.price}`,
    });
  });

const UpdateRecurringProductSchema = z.object({
  id: z.string(),
  productId: z.string(),
  price: z.number(),
  interval: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.date(),
  endDate: z.date().nullable(),
  isActive: z.boolean(),
});

export type UpdateReucrringProductDTO = z.infer<
  typeof UpdateRecurringProductSchema
>;

const updateRecurringProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(UpdateRecurringProductSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await recurringService.updateRecurringProduct(userId, data.id, {
      ...data,
      price: `${data.price}`,
    });
  });

export const recurringController = {
  getAllRecurringProducts,
  getRecurringProduct,
  addRecurringProduct,
  updateRecurringProduct,
};
