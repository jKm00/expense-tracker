import { queryOptions } from "@tanstack/react-query";
import { tagController } from "./tag.controller";

export const QUERY_KEY = "tags";

function getTagsOptions() {
  return queryOptions({
    queryKey: [QUERY_KEY],
    queryFn: () => tagController.getTags(),
  });
}

export const tagQueries = {
  getTagsOptions,
};
