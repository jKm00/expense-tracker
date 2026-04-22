import { queryOptions } from "@tanstack/react-query";
import { tagsController } from "./tags.controller";

export const TAG_QUERY_KEY = "tags";

function getTagsOptions() {
  return queryOptions({
    queryKey: [TAG_QUERY_KEY],
    queryFn: tagsController.getTags,
  });
}

function getTagOptions(tagId: string) {
  return queryOptions({
    queryKey: [TAG_QUERY_KEY, tagId],
    queryFn: () => tagsController.getTag({ data: { tagId } }),
  });
}

export const tagsQueries = {
  getTagsOptions,
  getTagOptions,
};
