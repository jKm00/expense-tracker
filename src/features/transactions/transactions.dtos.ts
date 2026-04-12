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
});

export type NewEntryDTO = z.infer<typeof saveEntrySchema>;

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

export const updateTransactionSchema = z.object({
  transactionId: z.string(),
  store: z.string().optional(),
  description: z.string().optional(),
  date: z.date(),
  entries: saveEntrySchema.array().min(1, "Need at least one transaction item"),
});

export type UpdateTransactionDTO = z.infer<typeof updateTransactionSchema>;
