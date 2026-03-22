import { err, ok } from "@/utils/result";
import { recurringRepo } from "./recurring.repo";
import {
  NewRecurringProduct,
  UpdateRecurringProduct,
} from "./recurring.models";
import { productService } from "../products/product.service";

async function getAllRecurringProducts(userId: string) {
  try {
    const found = await recurringRepo.getAll(userId);
    return ok(found);
  } catch (error) {
    return err({
      reason: "FETCH_RECURRING_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function getRecurringProduct(userId: string, id: string) {
  const found = await recurringRepo.get(id);
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

async function createRecurringProduct(
  userId: string,
  data: NewRecurringProduct,
) {
  const [productError] = await productService.getProduct(
    userId,
    data.productId,
  );
  if (productError) {
    return err(productError);
  }

  try {
    const saved = await recurringRepo.save(data);
    return ok(saved);
  } catch (error) {
    return err({
      reason: "RECURRING_SAVE_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function updateRecurringProduct(
  userId: string,
  id: string,
  data: UpdateRecurringProduct,
) {
  const [foundError] = await getRecurringProduct(userId, id);
  if (foundError) {
    return err(foundError);
  }

  const updated = await recurringRepo.update(id, data);
  return ok(updated);
}

export const recurringService = {
  getAllRecurringProducts,
  getRecurringProduct,
  createRecurringProduct,
  updateRecurringProduct,
};
