import z from "zod";

export const addProductSchema = z.object({
  product: z.object({
    name: z.string(),
  }),
  tagIds: z.string().array().optional(),
});

export type AddProductDTO = z.infer<typeof addProductSchema>;
