import { err, ok } from "@/utils/result";
import { productRepo } from "./products.repo";

async function getProducts(userId: string) {
  try {
    const products = await productRepo.getAll(userId);
    return ok(products);
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR",
      message:
        "Something unexpected happend when trying to fetch products from the DB",
    });
  }
}

export const productService = {
  getProducts,
};
