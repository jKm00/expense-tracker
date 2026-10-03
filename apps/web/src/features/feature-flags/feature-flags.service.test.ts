import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("featureFlagService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("./feature-flags.constants");
  });

  describe("isEnabled", () => {
    it("returns false when env is missing", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: undefined },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("example")).toBe(false);
    });

    it("returns false when env var is empty string", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("example")).toBe(false);
    });

    it("returns false for literal 'false'", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "false" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("example")).toBe(false);
    });

    it("returns false for literal '0'", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "0" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("example")).toBe(false);
    });

    it("returns true for literal 'true'", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "true" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("example")).toBe(true);
    });

    it("returns true for literal '1'", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "1" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("example")).toBe(true);
    });

    it("is case-insensitive for true/false/0/1", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "TRUE" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("example")).toBe(true);
    });

    it("returns false when no context is provided for allow-list", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "test@user.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(featureFlagService.isEnabled("example")).toBe(false);
    });

    it("returns true for single user in allow-list", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "test@user.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("example", {
          userIdentifier: "test@user.com",
        }),
      ).toBe(true);
    });

    it("returns true for user among many in allow-list", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "test@user.com, another@user.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("example", {
          userIdentifier: "test@user.com",
        }),
      ).toBe(true);
    });

    it("returns false for user not in allow-list", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "test@user.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("example", {
          userIdentifier: "another@user.com",
        }),
      ).toBe(false);
    });

    it("trims spaces around user identifiers", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "  alice@x.com ,   bob@x.com  " },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("example", {
          userIdentifier: "alice@x.com",
        }),
      ).toBe(true);
    });

    it("matches allow-listed user identifiers case-insensitively", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "Alice@X.com" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("example", {
          userIdentifier: "alice@x.com",
        }),
      ).toBe(true);
    });

    it("rejects unknown literal", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: { example: "enabled" },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");
      expect(
        featureFlagService.isEnabled("example", {
          userIdentifier: "alice@x.com",
        }),
      ).toBe(false);
    });
  });

  describe("getAll", () => {
    it("returns every configured feature flag for the current user", async () => {
      vi.doMock("./feature-flags.constants", () => ({
        featureFlags: {
          example: "true",
          allowListedFeature: "allowed@user.com",
          disabledFeature: "false",
        },
      }));
      const { featureFlagService } = await import("./feature-flags.service.ts");

      expect(
        featureFlagService.getAll({ userIdentifier: "allowed@user.com" }),
      ).toEqual({
        example: true,
        allowListedFeature: true,
        disabledFeature: false,
      });

      expect(
        featureFlagService.getAll({ userIdentifier: "other@user.com" }),
      ).toEqual({
        example: true,
        allowListedFeature: false,
        disabledFeature: false,
      });
    });
  });
});
