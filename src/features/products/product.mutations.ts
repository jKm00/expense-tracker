import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  NewRecurringProductDto,
  productController,
} from "./product.controller";
import { RECURRING_QUERY_KEY } from "./product.queries";

function addRecurringProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: NewRecurringProductDto) =>
      productController.addRecurringProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [RECURRING_QUERY_KEY],
      });
    },
  });
}

export const productMutations = {
  addRecurringProduct,
};
