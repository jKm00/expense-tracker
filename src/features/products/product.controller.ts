import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { productService } from "./product.service";
import z from "zod";

const FiltersSchema = z.object({
  excludeTaggedProducts: z.boolean().optional(),
});

const getAll = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(FiltersSchema)
  .handler(async ({ context, data }) => {
    return await productService.getAll(context.user.id, {
      excludeTaggedProducts: data.excludeTaggedProducts,
    });
  });

const ProductIdSchema = z.object({
  productId: z.string(),
});

const getProduct = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(ProductIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await productService.getProduct(userId, data.productId);
  });

const CreateProductSchema = z.object({
  name: z.string().min(1),
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

const createProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(CreateProductSchema)
  .handler(async ({ context, data }) => {
    return await productService.create(context.user.id, data.name);
  });

const UpdateProductSchema = z.object({
  productId: z.string(),
  name: z.string().min(1),
});

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

const updateProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(UpdateProductSchema)
  .handler(async ({ context, data }) => {
    return await productService.updateProduct(context.user.id, data.productId, {
      name: data.name,
    });
  });

const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(ProductIdSchema)
  .handler(async ({ context, data }) => {
    return await productService.deleteProduct(context.user.id, data.productId);
  });

const getProductUsage = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(ProductIdSchema)
  .handler(async ({ context, data }) => {
    return await productService.getProductUsage(
      context.user.id,
      data.productId,
    );
  });

export const productController = {
  getAll,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductUsage,
};
