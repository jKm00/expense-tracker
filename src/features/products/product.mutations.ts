import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateProductDTO,
  UpdateProductDTO,
  productController,
} from "./product.controller";
import { PRODUCT_QUERY_KEY } from "./product.queries";

function createProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDTO) =>
      productController.createProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
  });
}

function updateProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProductDTO) =>
      productController.updateProduct({ data }),
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
  });
}

function deleteProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string }) =>
      productController.deleteProduct({ data }),
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
  });
}

export const productMutations = {
  createProduct,
  updateProduct,
  deleteProduct,
};
