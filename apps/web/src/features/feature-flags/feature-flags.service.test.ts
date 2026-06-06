import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("featureFlagService", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("isEnabled", () => {
    it("returns false when env is missing", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: undefined },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("ANALYTICS_V2")).toBe(false);
    });

    it("returns false when env var is empty string", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("ANALYTICS_V2")).toBe(false);
    });

    it("returns false for literal 'false'", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "false" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("ANALYTICS_V2")).toBe(false);
    });

    it("returns false for literal '0'", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "0" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("ANALYTICS_V2")).toBe(false);
    });

    it("returns true for literal 'true'", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "true" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("ANALYTICS_V2")).toBe(true);
    });

    it("returns true for literal '1'", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "1" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("ANALYTICS_V2")).toBe(true);
    });

    it("is case-insensitive for true/false/0/1", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "TRUE" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("ANALYTICS_V2")).toBe(true);
    });

    it("returns false when no context is provided for allow-list", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "test@user.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("ANALYTICS_V2")).toBe(false);
    });

    it("returns true for single user in allow-list", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "test@user.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("ANALYTICS_V2", {
          userIdentifier: "test@user.com",
        }),
      ).toBe(true);
    });

    it("returns true for user among many in allow-list", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "test@user.com, another@user.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("ANALYTICS_V2", {
          userIdentifier: "test@user.com",
        }),
      ).toBe(true);
    });

    it("returns false for user not in allow-list", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "test@user.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("ANALYTICS_V2", {
          userIdentifier: "another@user.com",
        }),
      ).toBe(false);
    });

    it("trims spaces around user identifiers", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "  alice@x.com ,   bob@x.com  " },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("ANALYTICS_V2", {
          userIdentifier: "alice@x.com",
        }),
      ).toBe(true);
    });

    it("rejects unknown literal", async () => {
      vi.doMock("@/config/env", () => ({
        env: { ANALYTICS_V2_ACCESS: "enabled" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("ANALYTICS_V2", {
          userIdentifier: "alice@x.com",
        }),
      ).toBe(false);
    });
  });
});
