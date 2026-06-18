import { db } from "@/lib/db";
import {
  analyticsChartPreferences,
  analyticsExcludedProducts,
  analyticsExcludedTags,
} from "@/features/analytics/analytics.schema";
import { products } from "@/features/products/products.schema";
import { tags } from "@/features/tags/tags.schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

async function getPreferences(userId: string) {
  const [tagRows, productRows] = await Promise.all([
    db
      .select({ tagId: analyticsExcludedTags.tagId })
      .from(analyticsExcludedTags)
      .where(eq(analyticsExcludedTags.userId, userId)),
    db
      .select({ productId: analyticsExcludedProducts.productId })
      .from(analyticsExcludedProducts)
      .where(eq(analyticsExcludedProducts.userId, userId)),
  ]);
  const [chartPreferences] = await db
    .select({
      hideUntagged: analyticsChartPreferences.hideUntagged,
      hideUnknownProduct: analyticsChartPreferences.hideUnknownProduct,
    })
    .from(analyticsChartPreferences)
    .where(eq(analyticsChartPreferences.userId, userId))
    .limit(1);

  return {
    excludedTagIds: [
      ...tagRows.map((row) => row.tagId),
      ...(chartPreferences?.hideUntagged ? ["untagged"] : []),
    ],
    excludedProductIds: [
      ...productRows.map((row) => row.productId),
      ...(chartPreferences?.hideUnknownProduct ? ["unknown"] : []),
    ],
  };
}

async function getOwnedTagIds(userId: string, tagIds: string[]) {
  if (tagIds.length === 0) return [];

  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));

  return rows.map((row) => row.id);
}

async function getOwnedProductIds(userId: string, productIds: string[]) {
  if (productIds.length === 0) return [];

  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.userId, userId),
        isNull(products.deletedAt),
        inArray(products.id, productIds),
      ),
    );

  return rows.map((row) => row.id);
}

async function replaceExcludedTags(
  userId: string,
  tagIds: string[],
  hideUntagged: boolean,
) {
  return await db.transaction(async (tx) => {
    await tx
      .delete(analyticsExcludedTags)
      .where(eq(analyticsExcludedTags.userId, userId));

    await tx
      .insert(analyticsChartPreferences)
      .values({ userId, hideUntagged, hideUnknownProduct: false })
      .onConflictDoUpdate({
        target: analyticsChartPreferences.userId,
        set: { hideUntagged, updatedAt: new Date() },
      });

    if (tagIds.length === 0) return;

    await tx.insert(analyticsExcludedTags).values(
      tagIds.map((tagId) => ({
        userId,
        tagId,
      })),
    );
  });
}

async function replaceExcludedProducts(
  userId: string,
  productIds: string[],
  hideUnknownProduct: boolean,
) {
  return await db.transaction(async (tx) => {
    await tx
      .delete(analyticsExcludedProducts)
      .where(eq(analyticsExcludedProducts.userId, userId));

    await tx
      .insert(analyticsChartPreferences)
      .values({ userId, hideUntagged: false, hideUnknownProduct })
      .onConflictDoUpdate({
        target: analyticsChartPreferences.userId,
        set: { hideUnknownProduct, updatedAt: new Date() },
      });

    if (productIds.length === 0) return;

    await tx.insert(analyticsExcludedProducts).values(
      productIds.map((productId) => ({
        userId,
        productId,
      })),
    );
  });
}

async function removeExcludedProduct(userId: string, productId: string) {
  return await db
    .delete(analyticsExcludedProducts)
    .where(
      and(
        eq(analyticsExcludedProducts.userId, userId),
        eq(analyticsExcludedProducts.productId, productId),
      ),
    )
    .returning();
}

export const analyticsRepo = {
  getPreferences,
  getOwnedTagIds,
  getOwnedProductIds,
  replaceExcludedTags,
  replaceExcludedProducts,
  removeExcludedProduct,
};
