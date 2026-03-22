import { Product } from "../products/product.models";
import { RecurringProduct, RecurringWithProduct } from "./recurring.models";

function mapToRecurringWithProduct(rows: {
  recurringProduct: RecurringProduct;
  product: Product;
}): RecurringWithProduct {
  return {
    ...rows.recurringProduct,
    product: rows.product,
  };
}

export const recurringMappers = {
  mapToRecurringWithProduct,
};
