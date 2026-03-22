import { Product, ProductWithTags } from "./product.models";
import { Tag } from "../tags/tag.models";

function mapToProductsWithTags(
  rows: { product: Product; tag: Tag | null }[],
): ProductWithTags[] {
  const productMap = new Map<string, ProductWithTags>();

  for (const row of rows) {
    const existing = productMap.get(row.product.id);

    if (existing) {
      if (row.tag) {
        existing.tags.push(row.tag);
      }
    } else {
      productMap.set(row.product.id, {
        ...row.product,
        tags: row.tag ? [row.tag] : [],
      });
    }
  }

  return Array.from(productMap.values());
}

export const productMappers = {
  mapToProductsWithTags,
};
