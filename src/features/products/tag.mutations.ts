import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tagController } from "./tag.controller";
import { QUERY_KEY as TAG_QUERY_KEY } from "./tag.queries";
import { PRODUCT_QUERY_KEY } from "./product.queries";

function addTag() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color?: string }) =>
      await tagController.addTag({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [TAG_QUERY_KEY],
      });
    },
  });
}

function linkTagToProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { tagId: string; productId: string }) =>
      await tagController.linkTagToProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
  });
}

function unlinkTagFromProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { tagId: string; productId: string }) =>
      await tagController.unlinkTagFromProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
  });
}

export const tagMutations = {
  addTag,
  linkTagToProduct,
  unlinkTagFromProduct,
};
