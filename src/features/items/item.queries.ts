import { queryOptions } from "@tanstack/react-query";
import { itemController } from "./item.controller";

export const QUERY_KEY = "items";

export const itemQueries = {
  getItemsOptions: (userId?: string) =>
    queryOptions({
      queryKey: ["item", userId],
      queryFn: () => itemController.getAll(),
      enabled: !!userId,
    }),
};
