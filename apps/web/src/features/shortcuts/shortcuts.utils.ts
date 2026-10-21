import { ShortcutWithProducts } from "./shortcuts.models";

export function shortcutNeedsInput(shortcut: ShortcutWithProducts) {
  return shortcut.price == null || shortcut.products.length > 1;
}
