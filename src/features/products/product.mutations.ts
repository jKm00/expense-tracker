import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreateProductDTO,
  UpdateProductDTO,
  productController,
} from "./product.controller";
import { PRODUCT_QUERY_KEY } from "./product.queries";
import { assertOnline } from "@/lib/offline-guard";

function createProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductDTO) => {
      assertOnline();
      return await productController.createProduct({ data });
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

function updateProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProductDTO) => {
      assertOnline();
      return await productController.updateProduct({ data });
    },
    onSuccess: (data) => {
      const [error, product] = data;
      // Invalidate list query
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
      if (!error && product) {
        // Invalidate the specific product detail query
        qc.invalidateQueries({
          queryKey: [PRODUCT_QUERY_KEY, product.id],
        });
        // Invalidate the product usage query
        qc.invalidateQueries({
          queryKey: [PRODUCT_QUERY_KEY, product.id, "usage"],
        });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

function deleteProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { productId: string }) => {
      assertOnline();
      return await productController.deleteProduct({ data });
    },
    onSuccess: (_, variables) => {
      const productId = variables.productId;
      // Invalidate list query
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
      // Invalidate the product usage query (even though product is deleted, clear the cache)
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY, productId, "usage"],
      });
      // Invalidate the specific product detail query
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY, productId],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export const productMutations = {
  createProduct,
  updateProduct,
  deleteProduct,
};
