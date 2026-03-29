import { err, ok } from "@/utils/result";
import { productService } from "../products/product.service";
import { CreateTransactionInput } from "./transaction.dtos";
import { UpdateTransaction } from "./transaction.models";
import { transactionRepo } from "./transaction.repo";

async function getTransactions(userId: string, month: number, year: number) {
  try {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return ok(await transactionRepo.getAll(userId, start, end));
  } catch (error) {
    return err({
      reason: "TRANSACTION_DB_ERROR" as const,
      error: JSON.stringify(error),
    });
  }
}

async function getTransaction(userId: string, id: string) {
  const found = await transactionRepo.get(id);
  if (!found) {
    return err({
      reason: "TRANSACTION_NOT_FOUND" as const,
      message: `Transaction with id ${id} was not found`,
    });
  }

  if (found.transaction.userId !== userId) {
    return err({
      reason: "TRANSACTION_FORBIDDEN" as const,
      message: `User with id ${userId} does not have access to transaction with id ${id}`,
    });
  }

  return ok(found);
}

async function updateTransaction(
  userId: string,
  id: string,
  data: UpdateTransaction,
) {
  const [foundError] = await getTransaction(userId, id);
  if (foundError) {
    return err(foundError);
  }

  try {
    const updated = await transactionRepo.update(id, data);
    return ok(updated);
  } catch (error) {
    return err({
      reason: "TRANSACTION_UPDATE_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function deleteTransaction(userId: string, id: string) {
  const [foundError] = await getTransaction(userId, id);
  if (foundError) {
    return err(foundError);
  }

  try {
    const deleted = await transactionRepo.remove(id);
    return ok(deleted);
  } catch (error) {
    return err({
      reason: "TRANSACTION_DELETE_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function addTransaction(userId: string, data: CreateTransactionInput) {
  let [foundError, found] = await productService.getByName(
    userId,
    data.productName,
  );

  if (foundError) {
    return err({
      reason: "PRODUCT_SEARCH_ERROR" as const,
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
        reason: "PRODUCT_CREATION_ERROR" as const,
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
      reason: "TRANSACTION_CREATION_ERROR" as const,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const transactionService = {
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  addTransaction,
};
