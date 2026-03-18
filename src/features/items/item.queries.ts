import { queryOptions } from "@tanstack/react-query";
import { itemController } from "./item.controller";

export const QUERY_KEY = "items";

export const itemQueries = {
  getItemsOptions: () =>
    queryOptions({
      queryKey: [QUERY_KEY],
      queryFn: () => itemController.getAll(),
    }),
};
