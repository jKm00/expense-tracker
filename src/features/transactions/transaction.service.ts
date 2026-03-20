import { err, ok } from "@/utils/result";
import { productService } from "../products/product.service";
import { CreateTransactionInput } from "./transaction.dtos";
import { transactionRepo } from "./transaction.repo";

async function getTransactions(userId: string) {
  try {
    return ok(await transactionRepo.getAll(userId));
  } catch (error) {
    return err({
      reason: "TRANSACTION_DB_ERROR",
      error: JSON.stringify(error),
    });
  }
}

async function addTransaction(userId: string, data: CreateTransactionInput) {
  let [foundError, found] = await productService.getByName(userId, data.productName);

  if (foundError) {
    return err({
      reason: "PRODUCT_SEARCH_ERROR",
      error: foundError,
    });
  }

  if (!found) {
    const [createError, created] = await productService.create(
      userId,
      data.productName,
    );
    if (createError) {
      return err({
        reason: "PRODUCT_CREATION_ERROR",
        error: createError,
      });
    }
    found = created;
  }

  try {
    const res = await transactionRepo.save({
      userId,
      productId: found.id,
      price: data.price.toString(),
      type: data.type,
      source: data.source,
      date: new Date().toISOString().split("T")[0],
      description: data.description,
    });
    return ok(res);
  } catch (error) {
    return err({
      reason: "TRANSACTION_CREATION_ERROR",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const transactionService = {
  getTransactions,
  addTransaction,
};
