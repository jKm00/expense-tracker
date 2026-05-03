import z from "zod";
import { entryTypes, transactionSources } from "./transactions.models";
import {
  positiveIntegerValidator,
  positiveNumberValidator,
} from "@/validators";

export const getTransactionsSchema = z.object({
  year: z.number().optional(),
  month: z.number().optional(),
});

export const getTransactionSchema = z.object({
  transactionId: z.string(),
});

export const saveEntrySchema = z.object({
  product: z.object({
    id: z.string().nullable(),
    name: z.string(),
  }),
  quantity: positiveIntegerValidator,
  price: positiveNumberValidator,
  type: z.enum(entryTypes),
  tagIds: z.array(z.string()).default([]),
});

export type NewEntryDTO = z.input<typeof saveEntrySchema>;

export const saveTransactionSchema = z.object({
  store: z.string().optional(),
  description: z.string().optional(),
  source: z.enum(transactionSources),
  date: z.date(),
  entries: saveEntrySchema.array().min(1, "Need at least one transaction item"),
});

export type NewTransactionDTO = z.infer<typeof saveTransactionSchema>;

export const deleteTransactionSchema = z.object({
  transactionId: z.string(),
});

export type DeleteTransactionDTO = z.infer<typeof deleteTransactionSchema>;

export const updateEntrySchema = saveEntrySchema.extend({
  id: z.string().optional(),
});

export type UpdateEntryDTO = z.input<typeof updateEntrySchema>;

export const updateTransactionSchema = z.object({
  transactionId: z.string(),
  store: z.string().optional(),
  description: z.string().optional(),
  date: z.date(),
  entries: updateEntrySchema
    .array()
    .min(1, "Need at least one transaction item"),
});

export type UpdateTransactionDTO = z.infer<typeof updateTransactionSchema>;

export const linkTagToEntrySchema = z.object({
  transactionId: z.string(),
  entryId: z.string(),
  tagId: z.string(),
});

export type LinkTagToEntryDTO = z.infer<typeof linkTagToEntrySchema>;
