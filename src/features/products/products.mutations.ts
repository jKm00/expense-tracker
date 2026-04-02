import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddProductDTO, UpdateProductDTO } from "./products.dtos";
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

export const productMutations = {
  createProduct,
  updateProduct,
};
