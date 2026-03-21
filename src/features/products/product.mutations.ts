import { useMutation } from "@tanstack/react-query";
import { productController } from "./product.controller";
import { NewRecurringProduct } from "./product.models";

function addRecurringProduct() {
  return useMutation({
    mutationFn: (data: NewRecurringProduct) =>
      productController.addRecurringProduct(data),
  });
}
