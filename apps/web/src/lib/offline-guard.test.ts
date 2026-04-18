// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { assertOnline, OfflineError } from "./offline-guard";

describe("assertOnline", () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  it("does not throw when online", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });

    expect(() => assertOnline()).not.toThrow();
  });

  it("throws OfflineError when offline", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    expect(() => assertOnline()).toThrow(OfflineError);
    expect(() => assertOnline()).toThrow(
      "You're offline. Please reconnect to save changes.",
    );
  });

  it("OfflineError is instanceof Error", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    try {
      assertOnline();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(OfflineError);
    }
  });
});
