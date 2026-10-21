import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { shortcutService } from "./shortcuts.service";
import {
  createShortcutSchema,
  deleteShortcutSchema,
  getShortcutSchema,
  reorderShortcutsSchema,
  updateShortcutSchema,
} from "./shortcuts.dtos";

const getShortcuts = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    return await shortcutService.getShortcuts(context.user.id);
  });

const getShortcut = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .validator(getShortcutSchema)
  .handler(async ({ context, data }) => {
    return await shortcutService.getShortcut(context.user.id, data.shortcutId);
  });

const createShortcut = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(createShortcutSchema)
  .handler(async ({ context, data }) => {
    return await shortcutService.createShortcut(context.user.id, data);
  });

const updateShortcut = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(updateShortcutSchema)
  .handler(async ({ context, data }) => {
    const { shortcutId, ...rest } = data;
    return await shortcutService.updateShortcut(
      context.user.id,
      shortcutId,
      rest,
    );
  });

const deleteShortcut = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(deleteShortcutSchema)
  .handler(async ({ context, data }) => {
    return await shortcutService.deleteShortcut(
      context.user.id,
      data.shortcutId,
    );
  });

const reorderShortcuts = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(reorderShortcutsSchema)
  .handler(async ({ context, data }) => {
    return await shortcutService.reorderShortcuts(
      context.user.id,
      data.shortcutIds,
    );
  });

export const shortcutController = {
  reorderShortcuts,
  getShortcuts,
  getShortcut,
  createShortcut,
  updateShortcut,
  deleteShortcut,
};
