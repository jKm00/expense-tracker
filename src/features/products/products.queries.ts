import { queryOptions } from "@tanstack/react-query";
import { productController } from "./products.controller";

export const PRODUCT_QUERY_KEY = "products";

function getProductsOptions() {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY],
    queryFn: productController.getProducts,
  });
}

export const productQueries = {
  getProductsOptions,
};
