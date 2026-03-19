import { err } from "@/utils/result";
import { itemService } from "../items/item.service";
import { NewTransaction } from "./transaction.dtos";
import { transactionRepo } from "./transaction.repo";

async function addTransaction(userId: string, data: NewTransaction) {
  let [foundError, found] = await itemService.getByName(userId, data.itemName);

  if (foundError) {
    return err({
      reason: "FAILED_ITEM_FIND",
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
        reason: "FAILED_ITEM_CREATION",
        error: createError,
      });
    }
    found = created;
  }

  await transactionRepo.save();
}

export const transactionService = {
  addTransaction,
};
