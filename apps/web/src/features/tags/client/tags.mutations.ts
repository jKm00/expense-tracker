import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddTagDTO, DeleteTagDTO, UpdateTagDTO } from "@/features/tags/shared/tags.dtos";
import { assertOnline } from "@/lib/offline-guard";
import { tagsController } from "@/features/tags/server/tags.controller";
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

function updateTag() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTagDTO) => {
      assertOnline();
      return await tagsController.updateTag({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [TAG_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when updating the tag. Please try again!",
      );
    },
  });
}

function deleteTag() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteTagDTO) => {
      assertOnline();
      return await tagsController.deleteTag({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [TAG_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when trying to delete the tag. Please try again!",
      );
    },
  });
}

export const tagsMutations = {
  createTag,
  updateTag,
  deleteTag,
};
