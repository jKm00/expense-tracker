import {
  positiveIntegerValidator,
  positiveNumberValidator,
} from "@/validators";
import z from "zod";

export const entrySchema = z.object({
  productName: z.string(),
  quantity: positiveIntegerValidator,
  price: positiveNumberValidator,
});

export const transactionSchema = z.object({
  store: z.string().optional(),
  description: z.string().optional(),
  entries: entrySchema.array().min(1, "Need at least one product entry"),
});
