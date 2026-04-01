import { err, ok } from "@/utils/result";
import { productRepo } from "./products.repo";
import { NewProduct, Product } from "./products.models";

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
      reason: "UNEXPECTED_DB_ERROR",
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

async function linkTagToProduct(
  userId: string,
  productId: string,
  tagId: string,
) {
  const [foundError] = await getProduct(userId, productId);
  if (foundError) {
    return err(foundError);
  }

  await productRepo.saveTagLink(productId, tagId);
}

export const productService = {
  getProducts,
  getProduct,
  addProduct,
};
