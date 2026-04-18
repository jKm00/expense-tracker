import z from "zod";
import { recurringIntervals } from "./recurring.models";
import { entryTypes } from "../transactions/transactions.models";
import { positiveNumberValidator } from "@/validators";

export const getRecurringSchema = z.object({
  recurringId: z.string(),
});

export type GetRecurringDTO = z.infer<typeof getRecurringSchema>;

export const createRecurringSchema = z.object({
  product: z.object({
    id: z.string().nullable(),
    name: z.string(),
  }),
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
