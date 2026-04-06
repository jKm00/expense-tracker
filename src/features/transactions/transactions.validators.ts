import {
  positiveIntegerValidator,
  positiveNumberValidator,
} from "@/validators";
import z from "zod";

export const entrySchema = z.object({
  product: z.object(
    {
      id: z.string().nullable(),
      name: z.string(),
    },
    "Select a product",
  ),
  quantity: positiveIntegerValidator,
  price: positiveNumberValidator,
});

export const transactionSchema = z.object({
  store: z.string().optional(),
  description: z.string().optional(),
  entries: entrySchema.array().min(1, "Need at least on product entry"),
});
