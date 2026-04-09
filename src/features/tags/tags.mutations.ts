import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddTagDTO } from "./tags.dtos";
import { assertOnline } from "@/lib/offline-guard";
import { tagsController } from "./tags.controller";
import { TAG_QUERY_KEY } from "./tags.queries";
import { toast } from "sonner";

function createTag() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddTagDTO) => {
      assertOnline();
      return await tagsController.addTag({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [TAG_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when saving the tag. Please try again!",
      );
    },
  });
}

export const tagsMutations = {
  createTag,
};
