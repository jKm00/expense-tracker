import z from "zod";
import { entryTypes } from "../transactions/transactions.models";
import { positiveNumberValidator } from "@/validators";

const shortcutFields = {
  name: z.string().trim().min(1, "Name is required"),
  store: z.string().trim().optional(),
  type: z.enum(entryTypes),
  // null/undefined means the price is asked for when the shortcut runs
  price: positiveNumberValidator.nullish(),
  productIds: z
    .array(z.string())
    .min(1, "Select at least one product")
    .max(50),
};

export const getShortcutSchema = z.object({
  shortcutId: z.string(),
});

export const createShortcutSchema = z.object(shortcutFields);
export type CreateShortcutDTO = z.infer<typeof createShortcutSchema>;

export const updateShortcutSchema = z.object({
  shortcutId: z.string(),
  ...shortcutFields,
});
export type UpdateShortcutDTO = z.infer<typeof updateShortcutSchema>;

export const reorderShortcutsSchema = z.object({
  shortcutIds: z.array(z.string()).max(200),
});
export type ReorderShortcutsDTO = z.infer<typeof reorderShortcutsSchema>;

export const deleteShortcutSchema = z.object({
  shortcutId: z.string(),
});
export type DeleteShortcutDTO = z.infer<typeof deleteShortcutSchema>;
