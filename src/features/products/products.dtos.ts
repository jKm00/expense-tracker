import z from "zod";

export const getProductSchema = z.object({
  productId: z.string(),
});

export type GetProductDTO = z.infer<typeof getProductSchema>;

export const addProductSchema = z.object({
  product: z.object({
    name: z.string(),
  }),
  tagIds: z.string().array().optional(),
});

export type AddProductDTO = z.infer<typeof addProductSchema>;

export const updateProductSchema = z.object({
  productId: z.string(),
  name: z.string().optional(),
});

export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
