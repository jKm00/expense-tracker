import z from "zod";

export const getProductSchema = z.object({
  productId: z.string(),
});

export type GetProductDTO = z.infer<typeof getProductSchema>;

export const getProductStatsSchema = z.object({
  productId: z.string(),
});

export type GetProductStatsDTO = z.infer<typeof getProductStatsSchema>;

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

export const deleteProductSchema = z.object({
  productId: z.string(),
});

export type DeleteProductDTO = z.infer<typeof deleteProductSchema>;

export const linkTagSchema = z.object({
  tagId: z.string(),
  productId: z.string(),
});

export type LinkTagDTO = z.infer<typeof linkTagSchema>;
