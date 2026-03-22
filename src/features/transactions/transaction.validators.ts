import { numberInputValidator } from "@/validators";
import z from "zod";

const editFormValidation = z.object({
  price: numberInputValidator,
  type: z.enum(["expense", "income"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)"),
  description: z.string(),
});

export const transactionValidators = {
  editFormValidation,
};
