import z from "zod";
import { entryTypes, transactionSources } from "./transactions.models";
import {
  positiveIntegerValidator,
  positiveNumberValidator,
} from "@/validators";

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
  entries: saveEntrySchema.array(),
});

export type NewTransactionDTO = z.infer<typeof saveTransactionSchema>;
