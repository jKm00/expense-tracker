import { err, ok } from "@/utils/result";
import { ListTagsDTO } from "./tags.dtos";
import { tagsRepo } from "./tags.repo";
import { NewTag, TagKpis, TagPage, UpdateTag } from "./tags.models";

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

async function listTags(userId: string, input: ListTagsDTO) {
  try {
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 25;
    const search = input.search?.trim() || undefined;
    const tags = await tagsRepo.getPage({
      userId,
      offset,
      limit: limit + 1,
      search,
    });

    const pageTags = tags.slice(0, limit);
    const hasMore = tags.length > limit;

    return ok<TagPage>({
      tags: pageTags,
      hasMore,
      nextOffset: hasMore ? offset + pageTags.length : null,
    });
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR",
      message:
        "Something unexpected happen when trying to fetch paginated tags from the DB",
    });
  }
}

async function getTagKpis(userId: string) {
  try {
    const { count, totalReferences, mostUsedTagName } = await tagsRepo.getKpis(
      userId,
    );

    return ok<TagKpis>({
      count,
      averageReferences: count === 0 ? 0 : Math.round((totalReferences / count) * 100) / 100,
      mostUsedTagName,
    });
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR",
      message:
        "Something unexpected happen when trying to fetch tag kpis from the DB",
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

async function getTagByName(userId: string, tagName: string) {
  try {
    const tag = await tagsRepo.getFirstByName(userId, tagName);
    if (!tag) {
      return err({
        reason: "TAG_NOT_FOUND",
        message: `Tag with name ${tagName} not found for user ${userId}`,
      });
    }

    if (tag.userId !== userId) {
      return err({
        reason: "TAG_UNATHORIZED",
        message: `User with id ${userId} does not have access to tag with name ${tagName}`,
      });
    }

    return ok(tag);
  } catch (error) {
    return err({
      reason: "TAG_DB_ERROR",
      message: `Failed to fetch tag ${tagName} for user ${userId}`,
    });
  }
}

async function addTag(tag: NewTag) {
  const [foundError] = await getTagByName(tag.userId, tag.name);
  if (foundError && foundError.reason !== "TAG_NOT_FOUND") {
    return err(foundError);
  }

  try {
    const saved = await tagsRepo.save(tag);
    if (saved.length === 0) {
      return err({
        reason: "TAG_NOT_RETURNED",
        message: `No tag returned after saving`,
      });
    }
    return ok(saved[0]);
  } catch (error) {
    return err({
      reason: "TAG_DB_ERROR",
      message: `Failed to save tag ${tag.name} to DB`,
    });
  }
}

async function updateTag(userId: string, tagId: string, data: UpdateTag) {
  const [foundError] = await getTag(userId, tagId);
  if (foundError) {
    return err(foundError);
  }

  if (data.name) {
    const [nameError, existingTag] = await getTagByName(userId, data.name);
    if (!nameError && existingTag && existingTag.id !== tagId) {
      return err({
        reason: "TAG_ALREADY_EXISTS" as const,
        message: `A tag with the name '${data.name}' already exists`,
      });
    }
  }

  try {
    const updated = await tagsRepo.update(tagId, data);
    if (updated.length === 0) {
      return err({
        reason: "TAG_NOT_RETURNED" as const,
        message: `No tag returned after updating`,
      });
    }
    return ok(updated[0]);
  } catch (error) {
    return err({
      reason: "TAG_DB_ERROR" as const,
      message: `Failed to update tag ${tagId} in DB`,
    });
  }
}

async function deleteTag(userId: string, tagId: string) {
  const [foundError] = await getTag(userId, tagId);
  if (foundError) {
    return err(foundError);
  }

  try {
    const removed = await tagsRepo.remove(tagId);
    if (removed.length === 0) {
      return err({
        reason: "TAG_NOT_RETURNED",
        message: `No tag returned after deleting`,
      });
    }
    return ok(removed);
  } catch (error) {
    return err({
      reason: "TAG_DB_ERROR",
      message: `Failed to remove tag ${tagId} from DB`,
    });
  }
}

export const tagsService = {
  getTags,
  listTags,
  getTagKpis,
  getTag,
  addTag,
  updateTag,
  deleteTag,
};
