import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { productService } from "./products.service";

const getProducts = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await productService.getProducts(userId);
  });

export const productController = {
  getProducts,
};
