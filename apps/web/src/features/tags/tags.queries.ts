import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { tagsController } from "./tags.controller";

export const TAG_QUERY_KEY = "tags";

function getTagsOptions() {
  return queryOptions({
    queryKey: [TAG_QUERY_KEY],
    queryFn: tagsController.getTags,
  });
}

function getTagListOptions(search?: string) {
  return infiniteQueryOptions({
    queryKey: [TAG_QUERY_KEY, "list", search ?? ""],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      tagsController.listTags({
        data: {
          offset: pageParam,
          limit: 25,
          search,
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

function getTagKpisOptions() {
  return queryOptions({
    queryKey: [TAG_QUERY_KEY, "kpis"],
    queryFn: tagsController.getTagKpis,
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
  getTagListOptions,
  getTagKpisOptions,
  getTagOptions,
};
