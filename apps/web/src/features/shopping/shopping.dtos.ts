import z from "zod";
import { saveEntrySchema } from "../transactions/transactions.dtos";

const shoppingProductSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
});

export const getShoppingListSchema = z.object({}).optional();

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

export const shoppingCheckoutEntrySchema = saveEntrySchema.extend({
  shoppingItemId: z.string().optional(),
});

export type ShoppingCheckoutEntryDTO = z.input<
  typeof shoppingCheckoutEntrySchema
>;

export const completeShoppingSchema = z.object({
  store: z.string().optional(),
  description: z.string().optional(),
  date: z.date(),
  keepUncheckedItems: z.boolean(),
  shoppingItemIds: z.string().array().default([]),
  entries: shoppingCheckoutEntrySchema.array().min(1, "Need at least one checked shopping item"),
});

export type CompleteShoppingDTO = z.infer<typeof completeShoppingSchema>;
