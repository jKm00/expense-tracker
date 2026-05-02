import { queryOptions } from "@tanstack/react-query";
import { productController } from "./products.controller";

export const PRODUCT_QUERY_KEY = "products";

function getProductsOptions() {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY],
    queryFn: productController.getProducts,
  });
}

function getProductOptions(productId: string) {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, productId],
    queryFn: () => productController.getProduct({ data: { productId } }),
  });
}

function getProductStatsOptions(productId: string) {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, productId, "stats"],
    queryFn: () => productController.getProductStats({ data: { productId } }),
  });
}

export const productQueries = {
  getProductsOptions,
  getProductOptions,
  getProductStatsOptions,
};
