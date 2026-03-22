import z from "zod";

const createFormValidation = z.object({
  name: z.string().min(1, "Product name is required"),
});

const editFormValidation = z.object({
  name: z.string().min(1, "Product name is required"),
});

export const productValidators = {
  createFormValidation,
  editFormValidation,
};
