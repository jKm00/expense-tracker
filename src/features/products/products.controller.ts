import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { productService } from "./products.service";
import {
  addProductSchema,
  getProductSchema,
  linkTagSchema,
  updateProductSchema,
} from "./products.dtos";

const getProducts = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await productService.getProducts(userId);
  });

const getProduct = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getProductSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const productId = data.productId;
    return await productService.getProduct(userId, productId);
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

const updateProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(updateProductSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { productId, ...rest } = data;

    return await productService.updateProduct(userId, productId, rest);
  });

const linkTagToProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(linkTagSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { tagId, productId } = data;
    return await productService.linkTagToProduct(userId, productId, tagId);
  });

const unlinkTagFromProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(linkTagSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { tagId, productId } = data;
    return await productService.unlinkTagFromProduct(userId, productId, tagId);
  });

export const productController = {
  getProducts,
  getProduct,
  addProduct,
  updateProduct,
  linkTagToProduct,
  unlinkTagFromProduct,
};
