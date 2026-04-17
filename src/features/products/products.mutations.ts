import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddProductDTO, DeleteProductDTO, LinkTagDTO, UpdateProductDTO } from "./products.dtos";
import { productController } from "./products.controller";
import { PRODUCT_QUERY_KEY } from "./products.queries";
import { toast } from "sonner";

function createProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddProductDTO) => {
      assertOnline();
      return await productController.addProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened to save your product. Please try again!",
      );
    },
  });
}

function updateProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProductDTO) => {
      assertOnline();
      return await productController.updateProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened trying to update your product. Please try again!",
      );
    },
  });
}

function linkTagToProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: LinkTagDTO) => {
      assertOnline();
      return await productController.linkTagToProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened trying to link tag to product. Please try again!",
      );
    },
  });
}

function deleteProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteProductDTO) => {
      assertOnline();
      return await productController.deleteProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened trying to delete your product. Please try again!",
      );
    },
  });
}

function unlinkTagFromProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: LinkTagDTO) => {
      assertOnline();
      return await productController.unlinkTagFromProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened trying to unlink tag from product. Please try again!",
      );
    },
  });
}

export const productMutations = {
  createProduct,
  updateProduct,
  deleteProduct,
  linkTagToProduct,
  unlinkTagFromProduct,
};
