import { receiptScanningRepo } from "./receipt-scanning.repo";
import { normalizeReceiptName } from "./receipt-normalization";

async function upsertMapping(input: {
  userId: string;
  productId: string;
  itemName: string;
}) {
  const normalizedItemName = normalizeReceiptName(input.itemName);
  if (!normalizedItemName) {
    return;
  }

  const existing = await receiptScanningRepo.getMappingByNormalizedName(
    input.userId,
    normalizedItemName,
  );
  const now = new Date();

  if (existing) {
    await receiptScanningRepo.updateMapping(existing.id, {
      productId: input.productId,
      itemName: input.itemName,
      normalizedItemName,
      confirmationCount: existing.confirmationCount + 1,
      lastConfirmedAt: now,
      updatedAt: now,
    });
    return;
  }

  await receiptScanningRepo.saveMapping({
    userId: input.userId,
    productId: input.productId,
    itemName: input.itemName,
    normalizedItemName,
    confirmationCount: 1,
    lastConfirmedAt: now,
  });
}

async function deleteMappingsForProduct(productId: string) {
  return await receiptScanningRepo.deleteMappingsForProduct(productId);
}

export const receiptMappingsService = {
  upsertMapping,
  deleteMappingsForProduct,
};
