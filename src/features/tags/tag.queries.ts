import { queryOptions } from "@tanstack/react-query";
import { tagController } from "./tag.controller";

export const TAG_QUERY_KEY = "tags";

function getTagsOptions() {
  return queryOptions({
    queryKey: [TAG_QUERY_KEY],
    queryFn: () => tagController.getTags(),
  });
}

export const tagQueries = {
  getTagsOptions,
};
