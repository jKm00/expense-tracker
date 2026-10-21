import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./home.repo", () => ({
  homeRepo: { getWidgets: vi.fn(), saveConfig: vi.fn() },
}));

vi.mock("../shortcuts/shortcuts.service", () => ({
  shortcutService: { getShortcuts: vi.fn() },
}));

import { homeService } from "./home.service";
import { homeRepo } from "./home.repo";
import { shortcutService } from "../shortcuts/shortcuts.service";

const widgets = [
  { type: "shortcuts" as const, enabled: true },
  { type: "quick_log" as const, enabled: false },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("homeService", () => {
  describe("getHomeWidgets", () => {
    it("defaults to only the quick log for users without a saved layout", async () => {
      vi.mocked(homeRepo.getWidgets).mockResolvedValue([]);
      const [error, result] = await homeService.getHomeWidgets("u1");
      expect(error).toBeNull();
      expect(result).toEqual([
        { type: "quick_log", enabled: true },
        { type: "shortcuts", enabled: false },
      ]);
    });

    it("keeps the saved order", async () => {
      vi.mocked(homeRepo.getWidgets).mockResolvedValue(widgets);
      const [, result] = await homeService.getHomeWidgets("u1");
      expect(result).toEqual(widgets);
    });
  });

  describe("saveHomeConfig", () => {
    it("saves the layout and shortcut selection", async () => {
      vi.mocked(shortcutService.getShortcuts).mockResolvedValue([
        null,
        [{ id: "s1" }, { id: "s2" }] as never,
      ]);

      const [error] = await homeService.saveHomeConfig("u1", {
        widgets,
        shortcutIds: ["s1"],
        shortcutOrder: ["s2", "s1"],
      });

      expect(error).toBeNull();
      expect(homeRepo.saveConfig).toHaveBeenCalledWith("u1", {
        widgets,
        shortcutIds: ["s1"],
        shortcutOrder: ["s2", "s1"],
      });
    });

    it("rejects shortcuts the user does not own", async () => {
      vi.mocked(shortcutService.getShortcuts).mockResolvedValue([
        null,
        [{ id: "s1" }] as never,
      ]);

      const [error] = await homeService.saveHomeConfig("u1", {
        widgets,
        shortcutIds: ["other"],
        shortcutOrder: [],
      });

      expect(error?.reason).toBe("HOME_INVALID_SHORTCUT");
      expect(homeRepo.saveConfig).not.toHaveBeenCalled();
    });
  });
});
