import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tagController } from "./tag.controller";
import { TAG_QUERY_KEY } from "./tag.queries";
import { PRODUCT_QUERY_KEY } from "../products/product.queries";
import { assertOnline } from "@/lib/offline-guard";

function addTag() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      assertOnline();
      return await tagController.addTag({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [TAG_QUERY_KEY],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

function linkTagToProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { tagId: string; productId: string }) => {
      assertOnline();
      return await tagController.linkTagToProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

function unlinkTagFromProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { tagId: string; productId: string }) => {
      assertOnline();
      return await tagController.unlinkTagFromProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export const tagMutations = {
  addTag,
  linkTagToProduct,
  unlinkTagFromProduct,
};
