import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { productController } from "./products.controller";

export const PRODUCT_QUERY_KEY = "products";

function getProductsOptions() {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY],
    queryFn: productController.getProducts,
  });
}

function getProductListOptions() {
  return infiniteQueryOptions({
    queryKey: [PRODUCT_QUERY_KEY, "list"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      productController.listProducts({
        data: {
          offset: pageParam,
          limit: 25,
        },
      }),
    getNextPageParam: (lastPage) => {
      const [error, data] = lastPage;
      if (error || !data?.hasMore) {
        return null;
      }

      return data.nextOffset;
    },
  });
}

function getProductKpisOptions() {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY, "kpis"],
    queryFn: productController.getProductKpis,
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
  getProductListOptions,
  getProductKpisOptions,
  getProductOptions,
  getProductStatsOptions,
};
