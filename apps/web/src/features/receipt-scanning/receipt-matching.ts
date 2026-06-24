import { ProductWithTag } from "@/features/products/products.models";
import { ShoppingListWithItems } from "@/features/shopping/shopping.models";
import {
  ExtractedReceipt,
  ReceiptItemMapping,
  ReceiptScanLine,
  ReceiptScanSuggestion,
} from "./receipt-scanning.models";
import { normalizeReceiptName, tokenizeReceiptName } from "./receipt-normalization";

type MappingWithProduct = ReceiptItemMapping & {
  product: ProductWithTag | null;
};

type MatchOptions = {
  receipt: ExtractedReceipt;
  products: ProductWithTag[];
  mappings: MappingWithProduct[];
  shoppingItems?: ShoppingListWithItems["items"];
};

function overlapScore(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const bSet = new Set(b);
  const matches = a.filter((token) => bSet.has(token)).length;
  return matches / Math.max(a.length, b.length);
}

function includesScore(needle: string, haystack: string) {
  if (!needle || !haystack) {
    return 0;
  }

  if (needle === haystack) {
    return 1;
  }

  if (haystack.startsWith(needle) || needle.startsWith(haystack)) {
    return 0.82;
  }

  if (haystack.includes(needle) || needle.includes(haystack)) {
    return 0.72;
  }

  return 0;
}

function toSuggestion(
  product: ProductWithTag,
  score: number,
  reason: ReceiptScanSuggestion["reason"],
): ReceiptScanSuggestion {
  return {
    product: {
      id: product.id,
      name: product.name,
    },
    score: Math.round(score * 100) / 100,
    reason,
  };
}

function getShoppingContext(
  shoppingItems: ShoppingListWithItems["items"] | undefined,
) {
  const productIds = new Set<string>();
  const itemByProductId = new Map<string, ShoppingListWithItems["items"][number]>();

  for (const item of shoppingItems ?? []) {
    if (!item.checked) {
      continue;
    }

    productIds.add(item.product.id);
    itemByProductId.set(item.product.id, item);
  }

  return { productIds, itemByProductId };
}

function buildSuggestions(
  itemName: string,
  products: ProductWithTag[],
  shoppingProductIds: Set<string>,
) {
  const normalizedItemName = normalizeReceiptName(itemName);
  const itemTokens = tokenizeReceiptName(itemName);
  const suggestions = new Map<string, ReceiptScanSuggestion>();

  for (const product of products) {
    const normalizedProductName = normalizeReceiptName(product.name);
    const productTokens = tokenizeReceiptName(product.name);
    const baseScore = Math.max(
      includesScore(normalizedItemName, normalizedProductName),
      overlapScore(itemTokens, productTokens),
    );
    const shoppingBoost = shoppingProductIds.has(product.id) ? 0.12 : 0;
    const productScore = Math.min(1, baseScore + shoppingBoost);

    if (productScore >= 0.35) {
      suggestions.set(
        product.id,
        toSuggestion(
          product,
          productScore,
          shoppingProductIds.has(product.id) ? "shopping" : "product",
        ),
      );
    }

    for (const alias of product.aliases) {
      const normalizedAlias = alias.normalizedName || normalizeReceiptName(alias.name);
      const aliasScore = Math.max(
        includesScore(normalizedItemName, normalizedAlias),
        overlapScore(itemTokens, tokenizeReceiptName(alias.name)),
      );

      if (aliasScore < 0.5) {
        continue;
      }

      const existing = suggestions.get(product.id);
      if (!existing || existing.score < aliasScore) {
        suggestions.set(product.id, toSuggestion(product, aliasScore, "alias"));
      }
    }
  }

  return [...suggestions.values()]
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, 3);
}

export function matchReceiptToProducts({
  receipt,
  products,
  mappings,
  shoppingItems,
}: MatchOptions) {
  const activeProducts = products.filter((product) => product.deletedAt === null);
  const productsByNormalizedName = new Map(
    activeProducts.map((product) => [normalizeReceiptName(product.name), product]),
  );
  const { productIds: shoppingProductIds, itemByProductId } =
    getShoppingContext(shoppingItems);
  const mappingsByNormalizedName = new Map(
    mappings
      .filter((mapping) => mapping.product && mapping.product.deletedAt === null)
      .map((mapping) => [mapping.normalizedItemName, mapping]),
  );

  const lines: ReceiptScanLine[] = receipt.items.map((item, index) => {
    const normalizedItemName = normalizeReceiptName(item.name);
    const learnedMapping = mappingsByNormalizedName.get(normalizedItemName);
    const exactProduct = productsByNormalizedName.get(normalizedItemName);
    const selectedProduct = learnedMapping?.product ?? exactProduct ?? null;
    const suggestions = selectedProduct
      ? []
      : buildSuggestions(item.name, activeProducts, shoppingProductIds);
    const shoppingItem = selectedProduct
      ? itemByProductId.get(selectedProduct.id)
      : undefined;

    return {
      id: `scan-line-${index}-${normalizedItemName || "item"}`,
      receiptItemName: item.name,
      product: selectedProduct
        ? {
            id: selectedProduct.id,
            name: selectedProduct.name,
          }
        : null,
      suggestions,
      quantity: item.quantity,
      price: item.unitPrice,
      lineTotal: item.lineTotal,
      confidence: item.confidence,
      shoppingItemId: shoppingItem?.id,
    };
  });

  return {
    receipt,
    lines,
  };
}
