import { ok } from "@/utils/result";
import { err } from "../logger/logger.result";
import { getLogger } from "../logger/logger.context";
import { shortcutRepo } from "../shortcuts/shortcuts.repo";
import { shortcutService } from "../shortcuts/shortcuts.service";
import { homeRepo } from "./home.repo";
import { defaultHomeWidgets, HomeWidget } from "./home.models";

async function getHomeWidgets(userId: string) {
  getLogger().addAttrs({ homeAction: "getHomeWidgets" });

  try {
    const saved = await homeRepo.getWidgets(userId);
    const missing = defaultHomeWidgets.filter(
      (def) => !saved.some((widget) => widget.type === def.type),
    );
    return ok([...saved, ...missing]);
  } catch {
    return err({
      reason: "HOME_DB_ERROR" as const,
      message: "Failed to fetch home widgets",
    });
  }
}

async function saveHomeConfig(
  userId: string,
  {
    widgets,
    shortcutIds,
    shortcutOrder,
  }: {
    widgets: HomeWidget[];
    shortcutIds: string[];
    shortcutOrder: string[];
  },
) {
  getLogger().addAttrs({
    homeAction: "saveHomeConfig",
    homeShortcutCount: shortcutIds.length,
  });

  const [shortcutsError, owned] = await shortcutService.getShortcuts(userId);
  if (shortcutsError) {
    return err({
      reason: "HOME_DB_ERROR" as const,
      message: "Failed to verify shortcuts",
    });
  }

  const ownedIds = new Set(owned.map((s) => s.id));
  if ([...shortcutIds, ...shortcutOrder].some((id) => !ownedIds.has(id))) {
    return err({
      reason: "HOME_INVALID_SHORTCUT" as const,
      message: "One or more shortcuts could not be found",
    });
  }

  try {
    await homeRepo.saveWidgets(userId, widgets);
    await shortcutRepo.setShowOnHome(userId, shortcutIds);
    await shortcutRepo.reorder(userId, [...new Set(shortcutOrder)]);
    return ok(widgets);
  } catch {
    return err({
      reason: "HOME_DB_ERROR" as const,
      message: "Failed to save home configuration",
    });
  }
}

export const homeService = {
  getHomeWidgets,
  saveHomeConfig,
};
