import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "@/features/auth/server/auth.utils";
import { productService } from "./products.service";
import {
  addProductSchema,
  deleteProductSchema,
  getProductSchema,
  getProductStatsSchema,
  listProductsSchema,
  linkTagSchema,
  updateProductSchema,
  addProductAliasSchema,
  updateProductAliasSchema,
  deleteProductAliasSchema,
} from "@/features/products/shared/products.dtos";

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

const listProducts = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(listProductsSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await productService.listProducts(userId, data);
  });

const getProductKpis = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await productService.getProductKpis(userId);
  });

const getProductStats = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getProductStatsSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const productId = data.productId;
    return await productService.getProductStats(userId, productId);
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

const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(deleteProductSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { productId } = data;
    return await productService.deleteProduct(userId, productId);
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

const addProductAlias = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(addProductAliasSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { productId, name } = data;
    return await productService.addProductAlias(userId, productId, name);
  });

const updateProductAlias = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(updateProductAliasSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { aliasId, name } = data;
    return await productService.updateProductAlias(userId, aliasId, name);
  });

const deleteProductAlias = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(deleteProductAliasSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { aliasId } = data;
    return await productService.deleteProductAlias(userId, aliasId);
  });

export const productController = {
  getProducts,
  listProducts,
  getProductKpis,
  getProduct,
  getProductStats,
  addProduct,
  updateProduct,
  deleteProduct,
  linkTagToProduct,
  unlinkTagFromProduct,
  addProductAlias,
  updateProductAlias,
  deleteProductAlias,
};
