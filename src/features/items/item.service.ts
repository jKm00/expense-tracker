import { err, ok } from "@/utils/result";
import { itemRepo } from "./item.repo";

async function getAll(userId: string) {
  try {
    const found = await itemRepo.getAll(userId);
    return ok(found);
  } catch (error) {
    return err({
      reason: "DB_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function getByName(userId: string, name: string) {
  try {
    const found = await itemRepo.getByName(userId, name);
    return ok(found);
  } catch (error) {
    return err({
      reason: "DB_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

async function create(userId: string, item: string) {
  try {
    const saved = await itemRepo.save({ userId, name: item });
    return ok(saved);
  } catch (error) {
    return err({
      reason: "DB_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

export const itemService = {
  getAll,
  getByName,
  create,
};
