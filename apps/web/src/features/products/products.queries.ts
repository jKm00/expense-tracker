import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { productController } from "./products.controller";

export const PRODUCT_QUERY_KEY = "products";
const LIST_STALE_TIME_MS = 1000 * 60 * 5;

function getProductsOptions() {
  return queryOptions({
    queryKey: [PRODUCT_QUERY_KEY],
    queryFn: productController.getProducts,
  });
}

function getProductListOptions(input?: {
  group?: "tagged" | "untagged";
  search?: string;
}) {
  return infiniteQueryOptions({
    queryKey: [PRODUCT_QUERY_KEY, "list", input?.group ?? null, input?.search ?? ""],
    staleTime: LIST_STALE_TIME_MS,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      productController.listProducts({
        data: {
          offset: pageParam,
          limit: 25,
          group: input?.group,
          search: input?.search,
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
