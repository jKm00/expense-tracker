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

const getAllRecurrintProducts = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await productService.getAllRecurringProducts(userId);
  });

export const productController = {
  getAll,
  getProduct,
  getAllRecurrintProducts,
};
