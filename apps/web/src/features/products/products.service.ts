import { err, ok } from "@/utils/result";
import { ListProductsDTO } from "./products.dtos";
import { tagsService } from "../tags/tags.service";
import {
  NewProduct,
  Product,
  ProductKpis,
  ProductPage,
  UpdateProduct,
} from "./products.models";
import { productRepo } from "./products.repo";

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function trimName(value: string) {
  return value.trim();
}

async function getOwnedProduct(userId: string, productId: string) {
  try {
    const product = await productRepo.getOne(productId);
    if (!product) {
      return err({
        reason: "PRODUCT_NOT_FOUND" as const,
        message: `Product with id ${productId} not found`,
      });
    }

    if (product.userId !== userId) {
      return err({
        reason: "PRODUCT_UNAUTHORIZED" as const,
        message: `User with id ${userId} does not have access to product with id ${productId}`,
      });
    }

    return ok(product);
  } catch (error) {
    return err({
      reason: "PRODUCT_DB_ERROR" as const,
      message: `Failed to fetch product (${productId}) for user ${userId}`,
    });
  }
}

async function getAliasWithOwner(aliasId: string) {
  const alias = await productRepo.getAlias(aliasId);
  if (!alias) {
    return null;
  }

  const product = await productRepo.getOne(alias.productId);
  if (!product) {
    return null;
  }

  return { alias, product };
}

function isUniqueConstraintError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "23505";
}

async function getProducts(userId: string) {
  try {
    const products = await productRepo.getAll(userId);
    return ok(products);
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR" as const,
      message: `Failed to fetch products for user ${userId}`,
    });
  }
}

async function listProducts(userId: string, input: ListProductsDTO) {
  try {
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 25;
    const search = input.search?.trim() || undefined;
    const products = await productRepo.getPage({
      userId,
      offset,
      limit: limit + 1,
      group: input.group,
      search,
    });

    const pageProducts = products.slice(0, limit);
    const hasMore = products.length > limit;

    return ok<ProductPage>({
      products: pageProducts,
      hasMore,
      nextOffset: hasMore ? offset + pageProducts.length : null,
    });
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR" as const,
      message: `Failed to fetch paginated products for user ${userId}`,
    });
  }
}

async function getProductKpis(userId: string) {
  try {
    const { total, tagged } = await productRepo.getKpis(userId);

    return ok<ProductKpis>({
      total,
      tagged,
      untagged: total - tagged,
    });
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR" as const,
      message: `Failed to fetch product kpis for user ${userId}`,
    });
  }
}

async function getProduct(userId: string, productId: string) {
  const [productError, product] = await getOwnedProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  return ok(product);
}

async function getProductTagRows(userId: string, productIds: string[]) {
  try {
    const rows = await productRepo.getTagRows(userId, productIds);
    return ok(rows);
  } catch (error) {
    return err({
      reason: "PRODUCT_DB_ERROR" as const,
      message: `Failed to fetch product tags for user ${userId}`,
    });
  }
}

async function getProductStats(userId: string, productId: string) {
  const [productError] = await getOwnedProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  try {
    const stats = await productRepo.getStats(productId);
    return ok(stats);
  } catch (error) {
    return err({
      reason: "PRODUCT_DB_ERROR" as const,
      message: `Failed to fetch stats for product (${productId}) for user ${userId}`,
    });
  }
}

async function addProduct(product: NewProduct, tagIds?: string[]) {
  const trimmedProductName = trimName(product.name);

  let saved: Product;
  try {
    const res = await productRepo.save({ ...product, name: trimmedProductName });
    if (res.length === 0) {
      return err({
        reason: "PRODUCT_NOT_RETURNED" as const,
        message: "No product returned after saving",
      });
    }
    saved = res[0];
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR" as const,
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

async function updateProduct(userId: string, productId: string, data: UpdateProduct) {
  const [foundError] = await getOwnedProduct(userId, productId);
  if (foundError) {
    return err(foundError);
  }

  let normalizedNewName: string | null = null;
  if (data.name !== undefined) {
    const trimmedName = trimName(data.name);
    normalizedNewName = normalizeName(trimmedName);
    data = { ...data, name: trimmedName };
  }

  let updated: Product;
  try {
    const res = await productRepo.update(productId, data);
    if (res.length === 0) {
      return err({
        reason: "PRODUCT_UPDATE_FAILED" as const,
        message: "Failed to update product. Received no returning products",
      });
    }
    updated = res[0];
  } catch (error) {
    return err({
      reason: "UNEXPECTED_DB_ERROR" as const,
      message: `Failed to update product (${productId}) in the DB`,
    });
  }

  if (normalizedNewName) {
    const existingAlias = await productRepo.getAliasByNormalizedName(
      productId,
      normalizedNewName,
    );
    if (existingAlias) {
      await productRepo.removeAlias(existingAlias.id);
    }
  }

  return ok(updated);
}

async function addProductAlias(userId: string, productId: string, name: string) {
  const [productError, product] = await getOwnedProduct(userId, productId);
  if (productError) {
    return err(productError);
  }

  const trimmedName = trimName(name);
  const normalizedName = normalizeName(trimmedName);
  const normalizedCanonicalName = normalizeName(product.name);

  if (normalizedName === normalizedCanonicalName) {
    return err({
      reason: "PRODUCT_ALIAS_EQUALS_CANONICAL" as const,
      message: "Alias cannot be the same as product name",
    });
  }

  const existingAlias = await productRepo.getAliasByNormalizedName(
    productId,
    normalizedName,
  );
  if (existingAlias) {
    return err({
      reason: "PRODUCT_ALIAS_ALREADY_EXISTS" as const,
      message: "This alias already exists for this product",
    });
  }

  try {
    const res = await productRepo.saveAlias({
      productId,
      name: trimmedName,
      normalizedName,
    });

    if (res.length === 0) {
      return err({
        reason: "PRODUCT_ALIAS_NOT_RETURNED" as const,
        message: "No alias returned after saving",
      });
    }

    return ok(res[0]);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return err({
        reason: "PRODUCT_ALIAS_ALREADY_EXISTS" as const,
        message: "This alias already exists for this product",
      });
    }

    return err({
      reason: "PRODUCT_DB_ERROR" as const,
      message: `Failed to create alias for product ${productId}`,
    });
  }
}

async function updateProductAlias(userId: string, aliasId: string, name: string) {
  let aliasWithOwner: Awaited<ReturnType<typeof getAliasWithOwner>>;
  try {
    aliasWithOwner = await getAliasWithOwner(aliasId);
  } catch (error) {
    return err({
      reason: "PRODUCT_DB_ERROR" as const,
      message: `Failed to load alias ${aliasId}`,
    });
  }

  if (!aliasWithOwner) {
    return err({
      reason: "PRODUCT_ALIAS_NOT_FOUND" as const,
      message: "Alias no longer exists",
    });
  }

  if (aliasWithOwner.product.userId !== userId) {
    return err({
      reason: "PRODUCT_UNAUTHORIZED" as const,
      message: "You do not have permission to modify this alias",
    });
  }

  const trimmedName = trimName(name);
  const normalizedName = normalizeName(trimmedName);
  const normalizedCanonicalName = normalizeName(aliasWithOwner.product.name);

  if (normalizedName === normalizedCanonicalName) {
    return err({
      reason: "PRODUCT_ALIAS_EQUALS_CANONICAL" as const,
      message: "Alias cannot be the same as product name",
    });
  }

  const existingAlias = await productRepo.getAliasByNormalizedName(
    aliasWithOwner.product.id,
    normalizedName,
  );

  if (existingAlias && existingAlias.id !== aliasId) {
    return err({
      reason: "PRODUCT_ALIAS_ALREADY_EXISTS" as const,
      message: "This alias already exists for this product",
    });
  }

  try {
    const res = await productRepo.updateAlias(aliasId, {
      name: trimmedName,
      normalizedName,
    });

    if (res.length === 0) {
      return err({
        reason: "PRODUCT_ALIAS_NOT_FOUND" as const,
        message: "Alias no longer exists",
      });
    }

    return ok(res[0]);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return err({
        reason: "PRODUCT_ALIAS_ALREADY_EXISTS" as const,
        message: "This alias already exists for this product",
      });
    }

    return err({
      reason: "PRODUCT_DB_ERROR" as const,
      message: `Failed to update alias ${aliasId}`,
    });
  }
}

async function deleteProductAlias(userId: string, aliasId: string) {
  let aliasWithOwner: Awaited<ReturnType<typeof getAliasWithOwner>>;
  try {
    aliasWithOwner = await getAliasWithOwner(aliasId);
  } catch (error) {
    return err({
      reason: "PRODUCT_DB_ERROR" as const,
      message: `Failed to load alias ${aliasId}`,
    });
  }

  if (!aliasWithOwner) {
    return err({
      reason: "PRODUCT_ALIAS_NOT_FOUND" as const,
      message: "Alias no longer exists",
    });
  }

  if (aliasWithOwner.product.userId !== userId) {
    return err({
      reason: "PRODUCT_UNAUTHORIZED" as const,
      message: "You do not have permission to modify this alias",
    });
  }

  try {
    const removed = await productRepo.removeAlias(aliasId);
    if (removed.length === 0) {
      return err({
        reason: "PRODUCT_ALIAS_NOT_FOUND" as const,
        message: "Alias no longer exists",
      });
    }

    return ok({
      success: true as const,
      message: `Alias ${aliasId} removed`,
    });
  } catch (error) {
    return err({
      reason: "PRODUCT_DB_ERROR" as const,
      message: `Failed to remove alias ${aliasId}`,
    });
  }
}

async function linkTagToProduct(userId: string, productId: string, tagId: string) {
  const [foundProductError] = await getOwnedProduct(userId, productId);
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

async function unlinkTagFromProduct(userId: string, productId: string, tagId: string) {
  const [foundProductError] = await getOwnedProduct(userId, productId);
  if (foundProductError) {
    return err(foundProductError);
  }

  const removedLink = await productRepo.removeTagLink(productId, tagId);
  if (removedLink.length === 0) {
    return err({
      reason: "TAG_PRODUCT_LINK_NOT_FOUND" as const,
      message: `Link between tag ${tagId} and product ${productId} not found and was not removed`,
    });
  }

  return ok({
    success: true as const,
    message: `Tag ${tagId} unlinked from product ${productId}`,
  });
}

async function deleteProduct(userId: string, productId: string) {
  const [foundError] = await getOwnedProduct(userId, productId);
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
  listProducts,
  getProductKpis,
  getProduct,
  getProductTagRows,
  getProductStats,
  addProduct,
  updateProduct,
  deleteProduct,
  addProductAlias,
  updateProductAlias,
  deleteProductAlias,
  linkTagToProduct,
  unlinkTagFromProduct,
};
