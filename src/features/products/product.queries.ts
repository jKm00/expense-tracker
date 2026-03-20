import { queryOptions } from "@tanstack/react-query";
import { productController } from "./product.controller";

export const QUERY_KEY = "products";

export const productQueries = {
  getProductsOptions: (filters?: { excludeTaggedProducts?: boolean }) =>
    queryOptions({
      queryKey: [QUERY_KEY, filters],
      queryFn: () => productController.getAll({ data: filters ?? {} }),
    }),
};
