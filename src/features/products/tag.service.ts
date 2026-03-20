import { err, ok } from "@/utils/result";
import { tagRepo } from "./tag.repo";

async function getTags(userId: string) {
  try {
    const tags = await tagRepo.getAll(userId);
    return ok(tags);
  } catch (error) {
    return err({
      reason: "DB_FETCH_ERROR",
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
  }
}

export const tagService = {
  getTags,
};
