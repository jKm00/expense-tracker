import { queryOptions } from "@tanstack/react-query";
import { shortcutController } from "./shortcuts.controller";

export const SHORTCUT_QUERY_KEY = "shortcuts";

function getShortcutsOptions() {
  return queryOptions({
    queryKey: [SHORTCUT_QUERY_KEY],
    queryFn: shortcutController.getShortcuts,
  });
}

function getShortcutOptions(shortcutId: string) {
  return queryOptions({
    queryKey: [SHORTCUT_QUERY_KEY, shortcutId],
    queryFn: () => shortcutController.getShortcut({ data: { shortcutId } }),
  });
}

export const shortcutQueries = {
  getShortcutsOptions,
  getShortcutOptions,
};
