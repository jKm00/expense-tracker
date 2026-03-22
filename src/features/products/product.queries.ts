import { queryOptions } from "@tanstack/react-query";
import { productController } from "./product.controller";

export const PRODUCT_QUERY_KEY = "products";

function getProductsOptions(filters?: { excludeTaggedProducts?: boolean }) {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, filters],
    queryFn: () => productController.getAll({ data: filters ?? {} }),
  });
}

function getProductOptions(productId: string) {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, productId],
    queryFn: () => productController.getProduct({ data: { productId } }),
  });
}

function getProductUsageOptions(productId: string) {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, productId, "usage"],
    queryFn: () =>
      productController.getProductUsage({ data: { productId } }),
  });
}

export const productQueries = {
  getProductsOptions,
  getProductOptions,
  getProductUsageOptions,
};
