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
      ? await productRepo.getUntaggedProducts(userId)
      : await productRepo.getAll(userId);

    return ok(products);
  } catch (error) {
    return err({
      reason: "DB_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function getProduct(userId: string, productId: string) {
  const product = await productRepo.get(productId);

  if (!product) {
    return err({
      reason: "PRODUCT_NOT_FOUND",
      message: `Product with id ${productId} not found`,
    });
  }

  if (product.userId !== userId) {
    return err({
      reason: "PRODUCT_FORBIDDEN",
      message: `Product with id ${productId} is not a product of user with id ${userId}`,
    });
  }

  return ok(product);
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
  getProduct,
  getByName,
  create,
};
