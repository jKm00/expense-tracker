import { ok } from "@/utils/result";
import { err } from "@/features/logger/logger.result";
import { getLogger } from "@/features/logger/logger.context";
import { analyticsRepo } from "./analytics.repo";
import { AnalyticsExclusionType } from "./analytics.dtos";

async function getPreferences(userId: string) {
  getLogger().addAttrs({ analyticsAction: "getPreferences" });

  try {
    return ok(await analyticsRepo.getPreferences(userId));
  } catch (error) {
    return err({
      reason: "ANALYTICS_PREFERENCES_DB_ERROR" as const,
      message: "Failed to load analytics preferences",
    });
  }
}

async function updateExclusions(
  userId: string,
  type: AnalyticsExclusionType,
  ids: string[],
) {
  getLogger().addAttrs({
    analyticsAction: "updateExclusions",
    analyticsExclusionType: type,
    analyticsExclusionCount: ids.length,
  });
  const uniqueIds = Array.from(new Set(ids));
  const syntheticId = type === "tag" ? "untagged" : "unknown";
  const includesSynthetic = uniqueIds.includes(syntheticId);
  const realIds = uniqueIds.filter((id) => id !== syntheticId);

  if (realIds.some((id) => !isUuid(id))) {
    return err({
      reason: "ANALYTICS_EXCLUSION_INVALID_IDS" as const,
      message: "One or more excluded items are invalid",
    });
  }

  try {
    const ownedIds =
      type === "tag"
        ? await analyticsRepo.getOwnedTagIds(userId, realIds)
        : await analyticsRepo.getOwnedProductIds(userId, realIds);

    if (ownedIds.length !== realIds.length) {
      return err({
        reason: "ANALYTICS_EXCLUSION_INVALID_IDS" as const,
        message: "One or more excluded items do not exist or are not accessible",
      });
    }

    if (type === "tag") {
      await analyticsRepo.replaceExcludedTags(userId, realIds, includesSynthetic);
    } else {
      await analyticsRepo.replaceExcludedProducts(
        userId,
        realIds,
        includesSynthetic,
      );
    }

    return ok(await analyticsRepo.getPreferences(userId));
  } catch (error) {
    return err({
      reason: "ANALYTICS_PREFERENCES_DB_ERROR" as const,
      message: "Failed to update analytics preferences",
    });
  }
}

async function removeExcludedProduct(userId: string, productId: string) {
  getLogger().addAttrs({
    analyticsAction: "removeExcludedProduct",
    productId,
  });

  try {
    await analyticsRepo.removeExcludedProduct(userId, productId);
    return ok({ success: true as const });
  } catch (error) {
    return err({
      reason: "ANALYTICS_PREFERENCES_DB_ERROR" as const,
      message: "Failed to remove deleted product from analytics preferences",
    });
  }
}

export const analyticsService = {
  getPreferences,
  updateExclusions,
  removeExcludedProduct,
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
