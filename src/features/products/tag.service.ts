import { err, ok } from "@/utils/result";
import { tagRepo } from "./tag.repo";
import { Tag } from "./tag.models";
import { productService } from "./product.service";

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

async function linkTagToProduct(
  userId: string,
  tagId: string,
  productId: string,
) {
  const foundTag = await tagRepo.get(tagId);

  if (!foundTag) {
    return err({
      reason: "TAG_NOT_FOUND",
      message: `Tag with id ${tagId} not found`,
    });
  }

  if (foundTag.userId !== userId) {
    return err({
      reason: "TAG_FORBIDDEN",
      message: `User with id ${userId} does not own tag with id ${tagId}`,
    });
  }

  const [productError] = await productService.getProduct(userId, productId);
  if (productError) {
    return productError;
  }

  return await tagRepo.linkToProduct(tagId, productId);
}

export const tagService = {
  getTags,
  addTag,
  linkTagToProduct,
};
