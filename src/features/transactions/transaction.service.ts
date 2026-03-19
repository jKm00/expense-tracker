import { err, ok } from "@/utils/result";
import { itemService } from "../items/item.service";
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
  let [foundError, found] = await itemService.getByName(userId, data.itemName);

  if (foundError) {
    return err({
      reason: "ITEM_SEARCH_ERROR",
      error: foundError,
    });
  }

  if (!found) {
    const [createError, created] = await itemService.create(
      userId,
      data.itemName,
    );
    if (createError) {
      return err({
        reason: "ITEM_CREATION_ERROR",
        error: createError,
      });
    }
    found = created;
  }

  try {
    const res = await transactionRepo.save({
      userId,
      itemId: found.id,
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
