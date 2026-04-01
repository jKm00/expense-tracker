import { err, ok } from "@/utils/result";
import { tagsRepo } from "./tags.repo";

async function getTags(userId: string) {
  try {
    const tags = await tagsRepo.getAll(userId);
    return ok(tags);
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR",
      message:
        "Something unexpected happen when trying to fetch tags from the DB",
    });
  }
}

export const tagsService = {
  getTags,
};
