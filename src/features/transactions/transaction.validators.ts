import { numberInputValidator } from "@/validators";
import z from "zod";

const editFormValidation = z.object({
  price: numberInputValidator,
  type: z.enum(["expense", "income"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)"),
  description: z.string().optional(),
});

const addFormValidation = z.object({
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: numberInputValidator,
  type: z.enum(["expense", "income"]),
});

export const transactionValidators = {
  addFormValidation,
  editFormValidation,
};
