import z from "zod";

const productNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name must be at most 120 characters");

const aliasNameSchema = z
  .string()
  .trim()
  .min(1, "Alias name is required")
  .max(120, "Alias name must be at most 120 characters");

export const getProductSchema = z.object({
  productId: z.string(),
});

export type GetProductDTO = z.infer<typeof getProductSchema>;

export const getProductStatsSchema = z.object({
  productId: z.string(),
});

export type GetProductStatsDTO = z.infer<typeof getProductStatsSchema>;

export const listProductsSchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  group: z.enum(["tagged", "untagged"]).optional(),
  search: z.string().trim().max(120).optional(),
});

export type ListProductsDTO = z.infer<typeof listProductsSchema>;

export const addProductSchema = z.object({
  product: z.object({
    name: productNameSchema,
  }),
  tagIds: z.string().array().optional(),
});

export type AddProductDTO = z.infer<typeof addProductSchema>;

export const updateProductSchema = z.object({
  productId: z.string(),
  name: productNameSchema.optional(),
});

export type UpdateProductDTO = z.infer<typeof updateProductSchema>;

export const deleteProductSchema = z.object({
  productId: z.string(),
});

export const addProductAliasSchema = z.object({
  productId: z.string(),
  name: aliasNameSchema,
});

export const updateProductAliasSchema = z.object({
  aliasId: z.string(),
  name: aliasNameSchema,
});

export const deleteProductAliasSchema = z.object({
  aliasId: z.string(),
});

export type DeleteProductDTO = z.infer<typeof deleteProductSchema>;
export type AddProductAliasDTO = z.infer<typeof addProductAliasSchema>;
export type UpdateProductAliasDTO = z.infer<typeof updateProductAliasSchema>;
export type DeleteProductAliasDTO = z.infer<typeof deleteProductAliasSchema>;

export const linkTagSchema = z.object({
  tagId: z.string(),
  productId: z.string(),
});

export type LinkTagDTO = z.infer<typeof linkTagSchema>;
