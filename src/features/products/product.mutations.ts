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
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
  });
}

function deleteProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string }) =>
      productController.deleteProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [PRODUCT_QUERY_KEY],
      });
    },
  });
}

export const productMutations = {
  createProduct,
  updateProduct,
  deleteProduct,
};
