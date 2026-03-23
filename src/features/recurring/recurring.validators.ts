import { numberInputValidator } from "@/validators";
import z from "zod";

const addFormValidation = z.object({
  productId: z.string().min(1, "Product is required"),
  price: numberInputValidator,
  interval: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.date(),
  endDate: z.date().optional(),
});

const formValidation = z.object({
  productId: z.string(),
  price: numberInputValidator,
  interval: z.enum(["weekly", "monthly", "yearly"]),
  startDate: z.date(),
  endDate: z.date().nullable(),
  isActive: z.boolean(),
});

export const recurringValidators = {
  addFormValidation,
  formValidation,
};
