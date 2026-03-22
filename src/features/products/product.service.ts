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

async function updateProduct(
  userId: string,
  productId: string,
  data: { name: string },
) {
  const [productError] = await getProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  try {
    const updated = await productRepo.update(productId, data);
    return ok(updated);
  } catch (error) {
    return err({
      reason: "PRODUCT_UPDATE_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function deleteProduct(userId: string, productId: string) {
  const [productError] = await getProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  try {
    const deleted = await productRepo.deleteProduct(productId);
    return ok(deleted);
  } catch (error) {
    return err({
      reason: "PRODUCT_DELETE_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getProductUsage(userId: string, productId: string) {
  const [productError] = await getProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  try {
    const usage = await productRepo.getUsage(productId);
    return ok(usage);
  } catch (error) {
    return err({
      reason: "DB_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const productService = {
  getAll,
  getProduct,
  getByName,
  create,
  updateProduct,
  deleteProduct,
  getProductUsage,
};
