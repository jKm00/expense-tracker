import { err, ok } from "@/utils/result";
import { productRepo } from "./product.repo";

async function getAll(
  userId: string,
  filters?: {
    excludeTaggedProducts?: boolean;
  },
) {
  try {
    const products = filters?.excludeTaggedProducts
      ? await productRepo.getProductsWithoutAnyTags(userId)
      : await productRepo.getAll(userId);

    return ok(products);
  } catch (error) {
    return err({
      reason: "DB_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function getByName(userId: string, name: string) {
  try {
    const found = await productRepo.getByName(userId, name);
    return ok(found);
  } catch (error) {
    return err({
      reason: "DB_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function create(userId: string, product: string) {
  try {
    const saved = await productRepo.save({ userId, name: product });
    return ok(saved);
  } catch (error) {
    return err({
      reason: "DB_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

export const productService = {
  getAll,
  getByName,
  create,
};
