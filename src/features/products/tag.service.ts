import { err, ok } from "@/utils/result";
import { tagRepo } from "./tag.repo";
import { Tag } from "./tag.models";

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

async function addTag(
  userId: string,
  tag: Omit<Tag, "id" | "userId" | "createdAt" | "updatedAt">,
) {
  const found = await tagRepo.getByName(userId, tag.name);

  if (found) {
    return err({
      reason: "TAG_WITH_NAME_EXISTS",
      message: `Tag with name ${tag.name} already exists`,
    });
  }

  const created = await tagRepo.save({
    ...tag,
    userId,
  });
  return ok(created);
}

export const tagService = {
  getTags,
  addTag,
};
