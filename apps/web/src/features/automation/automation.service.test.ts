import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { makeProduct } from "../__test-fixtures__";

vi.mock("./automation.repo", () => ({
  automationRepo: {
    countActiveTokens: vi.fn(),
    saveToken: vi.fn(),
    getTokenById: vi.fn(),
    getTokenByHash: vi.fn(),
    getTokensByUser: vi.fn(),
    revokeToken: vi.fn(),
    touchTokenLastUsed: vi.fn(),
    getAutomationEventByDedupeKey: vi.fn(),
    saveAutomationEvent: vi.fn(),
    saveAutomationRequestLog: vi.fn(),
    getAutomationRequestLogsByUser: vi.fn(),
  },
}));

vi.mock("../products/products.service", () => ({
  productService: {
    getProducts: vi.fn(),
    addProduct: vi.fn(),
  },
}));

vi.mock("../transactions/transactions.service", () => ({
  transactionService: {
    saveTransaction: vi.fn(),
  },
}));

import { automationRepo } from "./automation.repo";
import { productService } from "../products/products.service";
import { transactionService } from "../transactions/transactions.service";
import { automationService } from "./automation.service";

const mockAutomationRepo = vi.mocked(automationRepo);
const mockProductService = vi.mocked(productService);
const mockTransactionService = vi.mocked(transactionService);

beforeEach(() => {
  vi.resetAllMocks();
  mockAutomationRepo.touchTokenLastUsed.mockResolvedValue([{}] as any);
});

describe("automationService", () => {
  describe("createToken", () => {
    it("creates token with hash-only storage and prefix", async () => {
      mockAutomationRepo.countActiveTokens.mockResolvedValue(0);
      mockAutomationRepo.saveToken.mockImplementation(async (data: any) => {
        return [
          {
            id: "token-1",
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
            lastUsedAt: null,
            revokedAt: null,
            ...data,
          },
        ] as any;
      });

      const [error, result] = await automationService.createToken(
        "user-1",
        "  Apple Pay iPhone  ",
      );

      expect(error).toBeNull();
      expect(result?.metadata.name).toBe("Apple Pay iPhone");
      expect(result?.token).toMatch(/^[a-f0-9]{64}$/);

      const saveCall = mockAutomationRepo.saveToken.mock.calls[0][0] as any;
      expect(saveCall.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(saveCall.tokenHash).not.toBe(result?.token);
      expect(saveCall.tokenPrefix).toBe(result?.token.slice(0, 4));
    });

    it("returns limit error when user has 10 active tokens", async () => {
      mockAutomationRepo.countActiveTokens.mockResolvedValue(10);

      const [error, result] = await automationService.createToken(
        "user-1",
        "Apple Pay",
      );

      expect(result).toBeNull();
      expect(error?.reason).toBe("AUTOMATION_TOKEN_LIMIT_REACHED");
      expect(mockAutomationRepo.saveToken).not.toHaveBeenCalled();
    });
  });

  describe("listTokens", () => {
    it("returns metadata only, never token hash", async () => {
      mockAutomationRepo.getTokensByUser.mockResolvedValue([
        {
          id: "token-1",
          userId: "user-1",
          name: "Apple Pay",
          tokenHash: "hash-value",
          tokenPrefix: "abcd",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          lastUsedAt: null,
          revokedAt: null,
        },
      ] as any);

      const [error, result] = await automationService.listTokens("user-1");

      expect(error).toBeNull();
      expect((result as any)?.[0]?.tokenHash).toBeUndefined();
      expect(result?.[0]?.tokenPrefix).toBe("abcd");
    });
  });

  describe("listRequestLogs", () => {
    it("returns paginated logs with next cursor", async () => {
      const firstDate = new Date("2026-03-02T12:00:00.000Z");
      const secondDate = new Date("2026-03-02T11:30:00.000Z");

      mockAutomationRepo.getAutomationRequestLogsByUser.mockResolvedValue([
        {
          id: "log-1",
          tokenId: "token-1",
          tokenName: "Apple Pay iPhone",
          tokenPrefix: "abcd",
          requestTokenPrefix: "abcd",
          requestMethod: "POST",
          requestPath: "/api/automation/import",
          provider: "apple_pay",
          eventId: "evt-1",
          requestBody: "{}",
          userAgent: "test",
          ipAddress: "127.0.0.1",
          responseStatus: 200,
          responseMessage: "ok",
          responseBody: "{}",
          errorReason: null,
          duplicate: false,
          durationMs: 12,
          transactionId: "tx-1",
          createdAt: firstDate,
        },
        {
          id: "log-2",
          tokenId: "token-1",
          tokenName: "Apple Pay iPhone",
          tokenPrefix: "abcd",
          requestTokenPrefix: "abcd",
          requestMethod: "POST",
          requestPath: "/api/automation/import",
          provider: "apple_pay",
          eventId: "evt-2",
          requestBody: "{}",
          userAgent: "test",
          ipAddress: "127.0.0.1",
          responseStatus: 200,
          responseMessage: "ok",
          responseBody: "{}",
          errorReason: null,
          duplicate: false,
          durationMs: 10,
          transactionId: "tx-2",
          createdAt: secondDate,
        },
      ] as never);

      const [error, result] = await automationService.listRequestLogs("user-1", {
        tokenId: "token-1",
        limit: 1,
      });

      expect(error).toBeNull();
      expect(result).toEqual({
        logs: [
          expect.objectContaining({
            id: "log-1",
          }),
        ],
        hasMore: true,
        nextCursor: firstDate.toISOString(),
      });
      expect(mockAutomationRepo.getAutomationRequestLogsByUser).toHaveBeenCalledWith({
        userId: "user-1",
        tokenId: "token-1",
        cursor: null,
        limit: 2,
      });
    });
  });

  describe("revokeToken", () => {
    it("returns not found when token does not exist", async () => {
      mockAutomationRepo.getTokenById.mockResolvedValue(undefined);

      const [error, result] = await automationService.revokeToken(
        "user-1",
        "token-1",
      );

      expect(result).toBeNull();
      expect(error?.reason).toBe("AUTOMATION_TOKEN_NOT_FOUND");
    });

    it("revokes token when owned by user", async () => {
      mockAutomationRepo.getTokenById.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        name: "Apple Pay",
        tokenHash: "hash",
        tokenPrefix: "abcd",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        lastUsedAt: null,
        revokedAt: null,
      } as any);
      mockAutomationRepo.revokeToken.mockResolvedValue([
        {
          id: "token-1",
          userId: "user-1",
          name: "Apple Pay",
          tokenHash: "hash",
          tokenPrefix: "abcd",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          lastUsedAt: null,
          revokedAt: new Date("2026-01-02"),
        },
      ] as any);

      const [error, result] = await automationService.revokeToken(
        "user-1",
        "token-1",
      );

      expect(error).toBeNull();
      expect(result?.revokedAt).not.toBeNull();
      expect(mockAutomationRepo.revokeToken).toHaveBeenCalledWith("token-1");
    });
  });

  describe("verifyBearerToken", () => {
    it("returns unauthorized for missing header", async () => {
      const [error, result] = await automationService.verifyBearerToken(null);
      expect(result).toBeNull();
      expect(error?.reason).toBe("AUTOMATION_UNAUTHORIZED");
    });

    it("returns unauthorized for revoked token", async () => {
      mockAutomationRepo.getTokenByHash.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        revokedAt: new Date("2026-01-01"),
      } as any);

      const [error, result] = await automationService.verifyBearerToken(
        "Bearer abcd",
      );

      expect(result).toBeNull();
      expect(error?.reason).toBe("AUTOMATION_UNAUTHORIZED");
    });

    it("returns token context for valid bearer token", async () => {
      const rawToken = "token-raw-value";
      const hash = createHash("sha256").update(rawToken, "utf8").digest("hex");

      mockAutomationRepo.getTokenByHash.mockImplementation(async (value) => {
        if (value !== hash) {
          return undefined as any;
        }

        return {
          id: "token-1",
          userId: "user-1",
          revokedAt: null,
        } as any;
      });

      const [error, result] = await automationService.verifyBearerToken(
        `Bearer ${rawToken}`,
      );

      expect(error).toBeNull();
      expect(result).toEqual({ userId: "user-1", tokenId: "token-1" });
      expect(mockAutomationRepo.touchTokenLastUsed).toHaveBeenCalledWith("token-1");
    });
  });

  describe("importAutomationTransaction", () => {
    function setupAuth() {
      mockAutomationRepo.getTokenByHash.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        revokedAt: null,
      } as any);
    }

    it("returns duplicate success when event already exists with same payload", async () => {
      setupAuth();
      const date = new Date("2026-01-15T12:00:00.000Z");
      mockAutomationRepo.getAutomationEventByDedupeKey.mockResolvedValue({
        id: "event-1",
        userId: "user-1",
        tokenId: "token-1",
        provider: "apple_pay",
        eventId: "evt-1",
        amount: "15.25",
        date,
        store: null,
        description: "Automation import (Apple Pay)",
        transactionId: "tx-1",
      } as any);

      const [error, result] = await automationService.importAutomationTransaction(
        "Bearer abcdef",
        {
          provider: "apple_pay",
          eventId: "evt-1",
          amount: 15.25,
          date: "2026-01-15T12:00:00.000Z",
        },
      );

      expect(error).toBeNull();
      expect(result).toEqual({ duplicate: true, transactionId: "tx-1" });
      expect(mockTransactionService.saveTransaction).not.toHaveBeenCalled();
    });

    it("returns conflict when existing event payload does not match", async () => {
      setupAuth();
      mockAutomationRepo.getAutomationEventByDedupeKey.mockResolvedValue({
        id: "event-1",
        userId: "user-1",
        tokenId: "token-1",
        provider: "apple_pay",
        eventId: "evt-1",
        amount: "20.00",
        date: new Date("2026-01-15T12:00:00.000Z"),
        store: null,
        description: "Automation import (Apple Pay)",
        transactionId: "tx-1",
      } as any);

      const [error, result] = await automationService.importAutomationTransaction(
        "Bearer abcdef",
        {
          provider: "apple_pay",
          eventId: "evt-1",
          amount: 15.25,
          date: "2026-01-15T12:00:00.000Z",
        },
      );

      expect(result).toBeNull();
      expect(error?.reason).toBe("AUTOMATION_IMPORT_CONFLICT");
    });

    it("creates transaction and event for new import", async () => {
      setupAuth();
      mockAutomationRepo.getAutomationEventByDedupeKey.mockResolvedValue(
        undefined as never,
      );
      mockProductService.getProducts.mockResolvedValue([null, []] as any);
      mockProductService.addProduct.mockResolvedValue([
        null,
        makeProduct({ id: "placeholder-1", name: "Automation import item" }),
      ] as any);
      mockTransactionService.saveTransaction.mockResolvedValue([
        null,
        { id: "tx-created" },
      ] as any);
      mockAutomationRepo.saveAutomationEvent.mockResolvedValue([
        { id: "event-created" },
      ] as any);

      const [error, result] = await automationService.importAutomationTransaction(
        "Bearer abcdef",
        {
          provider: "apple_pay",
          eventId: "evt-2",
          amount: 99.9,
          date: "2026-02-01T08:30:00+01:00",
        },
      );

      expect(error).toBeNull();
      expect(result).toEqual({ duplicate: false, transactionId: "tx-created" });
      expect(mockTransactionService.saveTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction: expect.objectContaining({
            source: "automation",
            needsReview: true,
            description: "Automation import (Apple Pay)",
          }),
          entries: [
            expect.objectContaining({
              product: {
                id: "placeholder-1",
                name: "Automation import item",
              },
              quantity: "1",
              price: "99.90",
              type: "expense",
            }),
          ],
        }),
      );
      expect(mockAutomationRepo.saveAutomationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          tokenId: "token-1",
          provider: "apple_pay",
          eventId: "evt-2",
          amount: "99.90",
          transactionId: "tx-created",
          description: "Automation import (Apple Pay)",
        }),
      );
    });
  });
});
