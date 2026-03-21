import { err, ok } from "@/utils/result";
import { productRepo } from "./product.repo";
import { NewRecurringProduct } from "./product.models";

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

async function getAllRecurringProducts(userId: string) {
  try {
    const found = await productRepo.getAllRecurring(userId);
    return ok(found);
  } catch (error) {
    return err({
      reason: "FETCH_RECURRING_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function getRecurringProduct(userId: string, id: string) {
  const found = await productRepo.getRecurring(id);
  if (!found) {
    return err({
      reason: "RECURRING_PRODUCT_NOT_FOUND",
      message: `Recurring product with id ${id} was not found`,
    });
  }

  if (found.product.userId !== userId) {
    return err({
      reason: "RECURRING_PRODUCT_FORBIDDEN",
      message: `User with id ${userId} does not have access to recurring product with id ${id}`,
    });
  }

  return ok(found);
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

async function createRecurringProduct(
  userId: string,
  data: NewRecurringProduct,
) {
  const [productError] = await getProduct(userId, data.productId);
  if (productError) {
    return err(productError);
  }

  try {
    const saved = await productRepo.saveRecurringProduct(data);
    return ok(saved);
  } catch (error) {
    return err({
      reason: "RECURRING_SAVE_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

export const productService = {
  getAll,
  getProduct,
  getByName,
  getAllRecurringProducts,
  getRecurringProduct,
  create,
  createRecurringProduct,
};
