import { err, ok } from "@/utils/result";
import { tagRepo } from "./tag.repo";
import { Tag } from "./tag.models";
import { productService } from "./product.service";

async function getTag(userId: string, tagId: string) {
  const tag = await tagRepo.get(tagId);

  if (!tag) {
    return err({
      reason: "TAG_NOT_FOUND",
      message: `Tag with id ${tagId} not found`,
    });
  }

  if (tag.userId !== userId) {
    return err({
      reason: "TAG_FORBIDDEN",
      message: `Tag with id ${tagId} is not a tag of user with id ${userId}`,
    });
  }

  return ok(tag);
}

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
  const [tagError] = await getTag(userId, tagId);
  if (tagError) {
    return err(tagError);
  }

  const [productError] = await productService.getProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  const link = await tagRepo.getLinkedTag(tagId, productId);
  if (link) {
    return err({
      reason: "TAG_ALREADY_LINKED",
      message: `Tag with id ${tagId} is already linked to product with id ${productId}`,
    });
  }

  const linked = await tagRepo.linkToProduct(tagId, productId);
  return ok(linked);
}

async function unlinkTagFromProduct(
  userId: string,
  tagId: string,
  productId: string,
) {
  const [tagError] = await getTag(userId, tagId);
  if (tagError) {
    return err(tagError);
  }

  const [productError] = await productService.getProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  const link = await tagRepo.getLinkedTag(tagId, productId);
  if (!link) {
    return err({
      reason: "TAG_LINK_NOT_FOUND",
      message: `Tag with id ${tagId} is not linked to product with id ${productId}`,
    });
  }

  const res = await tagRepo.unlinkFromProduct(tagId, productId);
  return ok(res);
}

export const tagService = {
  getTags,
  addTag,
  linkTagToProduct,
  unlinkTagFromProduct,
};
