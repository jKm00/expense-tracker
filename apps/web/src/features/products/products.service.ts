import { err, ok } from "@/utils/result";
import { productRepo } from "./products.repo";
import { NewProduct, Product, UpdateProduct } from "./products.models";
import { tagsService } from "../tags/tags.service";

async function getProducts(userId: string) {
  try {
    const products = await productRepo.getAll(userId);
    return ok(products);
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR",
      message: `Failed to fetch products for user ${userId}`,
    });
  }
}

async function getProduct(userId: string, productId: string) {
  try {
    const product = await productRepo.getOne(productId);
    if (!product) {
      return err({
        reason: "PRODUCT_NOT_FOUND",
        message: `Product with id ${productId} not found`,
      });
    }

    if (product.userId !== userId) {
      return err({
        reason: "PRODUCT_UNAUTHORIZED",
        message: `User with id ${userId} does not have access to product with id ${productId}`,
      });
    }

    return ok(product);
  } catch (error) {
    return err({
      reason: "PRODUCT_DB_ERROR",
      message: `Failed to fetch product (${productId}) for user ${userId}`,
    });
  }
}

async function addProduct(product: NewProduct, tagIds?: string[]) {
  let saved: Product;
  try {
    const res = await productRepo.save(product);
    if (res.length === 0) {
      return err({
        reason: "PRODUCT_NOT_RETURNED",
        message: `No product returned after saving`,
      });
    }
    saved = res[0];
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR",
      message: `Failed to save product (${product.name}) to the database`,
    });
  }

  if (tagIds) {
    await Promise.all(
      tagIds.map((tagId) => linkTagToProduct(product.userId, saved.id, tagId)),
    );
  }

  return ok(saved);
}

async function updateProduct(
  userId: string,
  productId: string,
  data: UpdateProduct,
) {
  const [foundError] = await getProduct(userId, productId);
  if (foundError) {
    return err(foundError);
  }

  let updated: Product;
  try {
    const res = await productRepo.update(productId, data);
    if (res.length === 0) {
      return err({
        reason: "PRODUCT_UPDATE_FAILED",
        message: "Failed to update product. Received no returning products",
      });
    }
    updated = res[0];
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR",
      message: `Failed to update product (${productId}) in the DB`,
    });
  }

  return ok(updated);
}

async function linkTagToProduct(
  userId: string,
  productId: string,
  tagId: string,
) {
  const [foundProductError] = await getProduct(userId, productId);
  if (foundProductError) {
    return err(foundProductError);
  }

  const [foundTagError] = await tagsService.getTag(userId, tagId);
  if (foundTagError) {
    return err(foundTagError);
  }

  await productRepo.saveTagLink(productId, tagId);
  return ok({
    success: true as const,
    message: `Tag ${tagId} linked to product ${productId}`,
  });
}

async function unlinkTagFromProduct(
  userId: string,
  productId: string,
  tagId: string,
) {
  const [foundProductError] = await getProduct(userId, productId);
  if (foundProductError) {
    return err(foundProductError);
  }

  const removedLink = await productRepo.removeTagLink(productId, tagId);
  if (removedLink.length === 0) {
    return err({
      reason: "TAG_PRODUCT_LINK_NOT_FOUND",
      message: `Link between tag ${tagId} and product ${productId} not found and was not removed`,
    });
  }

  return ok({
    success: true as const,
    message: `Tag ${tagId} unlinked from product ${productId}`,
  });
}

async function deleteProduct(userId: string, productId: string) {
  const [foundError] = await getProduct(userId, productId);
  if (foundError) {
    return err(foundError);
  }

  try {
    const res = await productRepo.softDelete(productId);
    if (res.length === 0) {
      return err({
        reason: "PRODUCT_DELETE_FAILED" as const,
        message: "Failed to delete product. No product returned",
      });
    }
    return ok(res[0]);
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR" as const,
      message: `Failed to delete product (${productId}) from the DB`,
    });
  }
}

export const productService = {
  getProducts,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct,
  linkTagToProduct,
  unlinkTagFromProduct,
};
