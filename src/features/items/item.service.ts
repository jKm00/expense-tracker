import { err, ok } from "@/utils/result";
import { itemRepo } from "./item.repo";

async function getAll(userId: string) {
  try {
    const found = await itemRepo.getAll(userId);
    return ok(found);
  } catch (error) {
    return err({
      reason: "UNKNOWN",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

export const itemService = {
  getAll,
};
