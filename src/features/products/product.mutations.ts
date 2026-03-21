import { useMutation } from "@tanstack/react-query";
import { productController } from "./product.controller";

function addRecurringProduct() {
  return useMutation({
    mutationFn: (data: {}) => productController.addRecurringProduct(data),
  });
}
