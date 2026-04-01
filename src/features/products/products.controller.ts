import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { productService } from "./products.service";
import { addProductSchema } from "./products.dtos";

const getProducts = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await productService.getProducts(userId);
  });

const addProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(addProductSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const product = data.product;
    const tagIds = data.tagIds;

    return await productService.addProduct({ userId, ...product }, tagIds);
  });

export const productController = {
  getProducts,
  addProduct,
};
