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

async function getTag(userId: string, tagId: string) {
  try {
    const tag = await tagsRepo.getFirst(tagId);
    if (!tag) {
      return err({
        reason: "TAG_NOT_FOUND",
        message: `Tag with id ${tagId} not found`,
      });
    }

    if (tag.userId !== userId) {
      return err({
        reason: "TAG_UNATHORIZED",
        message: `User with id ${userId} does not have access to tag with id ${tagId}`,
      });
    }

    return ok(tag);
  } catch (error) {
    return err({
      reason: "TAG_DB_ERROR",
      message: `Failed to fetch tag ${tagId} for user ${userId}`,
    });
  }
}

export const tagsService = {
  getTags,
  getTag,
};
