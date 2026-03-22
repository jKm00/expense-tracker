import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { tagService } from "./tag.service";
import z from "zod";

const getTags = createServerFn()
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await tagService.getTags(userId);
  });

const NewTagSchema = z.object({
  name: z.string(),
  color: z.string().optional(),
});

const addTag = createServerFn()
  .middleware([authenticated])
  .inputValidator(NewTagSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await tagService.addTag(userId, {
      ...data,
      color: data.color ?? null,
    });
  });

const LinkTagToProductSchema = z.object({
  tagId: z.string(),
  productId: z.string(),
});

const linkTagToProduct = createServerFn()
  .middleware([authenticated])
  .inputValidator(LinkTagToProductSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await tagService.linkTagToProduct(
      userId,
      data.tagId,
      data.productId,
    );
  });

const UnlinkTagToProductSchema = z.object({
  tagId: z.string(),
  productId: z.string(),
});

const unlinkTagFromProduct = createServerFn()
  .middleware([authenticated])
  .inputValidator(UnlinkTagToProductSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await tagService.unlinkTagFromProduct(
      userId,
      data.tagId,
      data.productId,
    );
  });

export const tagController = {
  getTags,
  addTag,
  linkTagToProduct,
  unlinkTagFromProduct,
};
