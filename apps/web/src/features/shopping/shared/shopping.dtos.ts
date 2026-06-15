import z from "zod";
import { saveEntrySchema } from "@/features/transactions/shared/transactions.dtos";

const shoppingProductSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
});

export const addShoppingItemSchema = z.object({
  product: shoppingProductSchema,
});

export type AddShoppingItemDTO = z.infer<typeof addShoppingItemSchema>;

export const removeShoppingItemSchema = z.object({
  shoppingItemId: z.string(),
});

export type RemoveShoppingItemDTO = z.infer<typeof removeShoppingItemSchema>;

export const toggleShoppingItemSchema = z.object({
  shoppingItemId: z.string(),
  checked: z.boolean(),
});

export type ToggleShoppingItemDTO = z.infer<typeof toggleShoppingItemSchema>;

const shoppingCheckoutEntrySchema = saveEntrySchema.extend({
  shoppingItemId: z.string().optional(),
});

export const completeShoppingSchema = z.object({
  store: z.string().optional(),
  description: z.string().optional(),
  date: z.date(),
  transactionId: z.string().optional(),
  keepUncheckedItems: z.boolean(),
  shoppingItemIds: z.string().array().default([]),
  entries: shoppingCheckoutEntrySchema.array().min(1, "Need at least one checked shopping item"),
});

export type CompleteShoppingDTO = z.infer<typeof completeShoppingSchema>;
