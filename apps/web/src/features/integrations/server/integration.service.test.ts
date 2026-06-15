import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { makeProduct } from "@/features/__test-fixtures__";

vi.mock("./integration.repo", () => ({
  integrationRepo: {
    countActiveTokens: vi.fn(),
    saveToken: vi.fn(),
    getTokenById: vi.fn(),
    getTokenByHash: vi.fn(),
    getTokensByUser: vi.fn(),
    revokeToken: vi.fn(),
    touchTokenLastUsed: vi.fn(),
    getIntegrationEventByDedupeKey: vi.fn(),
    saveIntegrationEvent: vi.fn(),
    saveIntegrationRequestLog: vi.fn(),
    getIntegrationRequestLogsByUser: vi.fn(),
  },
}));

vi.mock("@/features/products/server/products.service", () => ({
  productService: {
    getProducts: vi.fn(),
    addProduct: vi.fn(),
  },
}));

vi.mock("@/features/transactions/server/transactions.service", () => ({
  transactionService: {
    saveTransaction: vi.fn(),
  },
}));

import { integrationRepo } from "./integration.repo";
import { productService } from "@/features/products/server/products.service";
import { transactionService } from "@/features/transactions/server/transactions.service";
import { integrationService } from "./integration.service";

const mockIntegrationRepo = vi.mocked(integrationRepo);
const mockProductService = vi.mocked(productService);
const mockTransactionService = vi.mocked(transactionService);

beforeEach(() => {
  vi.resetAllMocks();
  mockIntegrationRepo.touchTokenLastUsed.mockResolvedValue([{}] as any);
});

describe("integrationService", () => {
  describe("createToken", () => {
    it("creates token with hash-only storage and prefix", async () => {
      mockIntegrationRepo.countActiveTokens.mockResolvedValue(0);
      mockIntegrationRepo.saveToken.mockImplementation(async (data: any) => {
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

      const [error, result] = await integrationService.createToken(
        "user-1",
        "  Apple Pay iPhone  ",
      );

      expect(error).toBeNull();
      expect(result?.metadata.name).toBe("Apple Pay iPhone");
      expect(result?.token).toMatch(/^[a-f0-9]{64}$/);

      const saveCall = mockIntegrationRepo.saveToken.mock.calls[0][0] as any;
      expect(saveCall.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(saveCall.tokenHash).not.toBe(result?.token);
      expect(saveCall.tokenPrefix).toBe(result?.token.slice(0, 4));
    });

    it("returns limit error when user has 10 active tokens", async () => {
      mockIntegrationRepo.countActiveTokens.mockResolvedValue(10);

      const [error, result] = await integrationService.createToken(
        "user-1",
        "Apple Pay",
      );

      expect(result).toBeNull();
      expect(error?.reason).toBe("INTEGRATION_TOKEN_LIMIT_REACHED");
      expect(mockIntegrationRepo.saveToken).not.toHaveBeenCalled();
    });
  });

  describe("listTokens", () => {
    it("returns metadata only, never token hash", async () => {
      mockIntegrationRepo.getTokensByUser.mockResolvedValue([
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

      const [error, result] = await integrationService.listTokens("user-1");

      expect(error).toBeNull();
      expect((result as any)?.[0]?.tokenHash).toBeUndefined();
      expect(result?.[0]?.tokenPrefix).toBe("abcd");
    });
  });

  describe("listRequestLogs", () => {
    it("returns paginated logs with next cursor", async () => {
      const firstDate = new Date("2026-03-02T12:00:00.000Z");
      const secondDate = new Date("2026-03-02T11:30:00.000Z");

      mockIntegrationRepo.getIntegrationRequestLogsByUser.mockResolvedValue([
        {
          id: "log-1",
          tokenId: "token-1",
          tokenName: "Apple Pay iPhone",
          tokenPrefix: "abcd",
          requestTokenPrefix: "abcd",
          requestMethod: "POST",
          requestPath: "/api/integrations/transactions",
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
          requestPath: "/api/integrations/transactions",
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

      const [error, result] = await integrationService.listRequestLogs("user-1", {
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
      expect(mockIntegrationRepo.getIntegrationRequestLogsByUser).toHaveBeenCalledWith({
        userId: "user-1",
        tokenId: "token-1",
        cursor: null,
        limit: 2,
      });
    });
  });

  describe("revokeToken", () => {
    it("returns not found when token does not exist", async () => {
      mockIntegrationRepo.getTokenById.mockResolvedValue(undefined);

      const [error, result] = await integrationService.revokeToken(
        "user-1",
        "token-1",
      );

      expect(result).toBeNull();
      expect(error?.reason).toBe("INTEGRATION_TOKEN_NOT_FOUND");
    });

    it("revokes token when owned by user", async () => {
      mockIntegrationRepo.getTokenById.mockResolvedValue({
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
      mockIntegrationRepo.revokeToken.mockResolvedValue([
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

      const [error, result] = await integrationService.revokeToken(
        "user-1",
        "token-1",
      );

      expect(error).toBeNull();
      expect(result?.revokedAt).not.toBeNull();
      expect(mockIntegrationRepo.revokeToken).toHaveBeenCalledWith("token-1");
    });
  });

  describe("verifyBearerToken", () => {
    it("returns unauthorized for missing header", async () => {
      const [error, result] = await integrationService.verifyBearerToken(null);
      expect(result).toBeNull();
      expect(error?.reason).toBe("INTEGRATION_NO_TOKEN");
      expect(error?.message).toBe("Missing or malformed bearer token");
    });

    it("returns forbidden for revoked token", async () => {
      mockIntegrationRepo.getTokenByHash.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        revokedAt: new Date("2026-01-01"),
      } as any);

      const [error, result] = await integrationService.verifyBearerToken(
        "Bearer abcd",
      );

      expect(result).toBeNull();
      expect(error).toEqual({
        reason: "INTEGRATION_TOKEN_REVOKED",
        message: "Token has been revoked and can no longer be used",
        userId: "user-1",
        tokenId: "token-1",
      });
    });

    it("returns token context for valid bearer token", async () => {
      const rawToken = "token-raw-value";
      const hash = createHash("sha256").update(rawToken, "utf8").digest("hex");

      mockIntegrationRepo.getTokenByHash.mockImplementation(async (value) => {
        if (value !== hash) {
          return undefined as any;
        }

        return {
          id: "token-1",
          userId: "user-1",
          revokedAt: null,
        } as any;
      });

      const [error, result] = await integrationService.verifyBearerToken(
        `Bearer ${rawToken}`,
      );

      expect(error).toBeNull();
      expect(result).toEqual({ userId: "user-1", tokenId: "token-1" });
      expect(mockIntegrationRepo.touchTokenLastUsed).toHaveBeenCalledWith("token-1");
    });
  });

  describe("importIntegrationTransaction", () => {
    function setupAuth() {
      mockIntegrationRepo.getTokenByHash.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        revokedAt: null,
      } as any);
    }

    it("returns duplicate success when event already exists with same payload", async () => {
      setupAuth();
      const date = new Date("2026-01-15T12:00:00.000Z");
      mockIntegrationRepo.getIntegrationEventByDedupeKey.mockResolvedValue({
        id: "event-1",
        userId: "user-1",
        tokenId: "token-1",
        provider: "apple_pay",
        eventId: "evt-1",
        amount: "15.25",
        date,
        store: null,
        description: "Integration import (Apple Pay)",
        transactionId: "tx-1",
      } as any);

      const [error, result] = await integrationService.importIntegrationTransaction(
        {
          userId: "user-1",
          tokenId: "token-1",
        },
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
      mockIntegrationRepo.getIntegrationEventByDedupeKey.mockResolvedValue({
        id: "event-1",
        userId: "user-1",
        tokenId: "token-1",
        provider: "apple_pay",
        eventId: "evt-1",
        amount: "20.00",
        date: new Date("2026-01-15T12:00:00.000Z"),
        store: null,
        description: "Integration import (Apple Pay)",
        transactionId: "tx-1",
      } as any);

      const [error, result] = await integrationService.importIntegrationTransaction(
        {
          userId: "user-1",
          tokenId: "token-1",
        },
        {
          provider: "apple_pay",
          eventId: "evt-1",
          amount: 15.25,
          date: "2026-01-15T12:00:00.000Z",
        },
      );

      expect(result).toBeNull();
      expect(error?.reason).toBe("INTEGRATION_IMPORT_CONFLICT");
    });

    it("creates transaction and event for new import", async () => {
      setupAuth();
      mockIntegrationRepo.getIntegrationEventByDedupeKey.mockResolvedValue(
        undefined as never,
      );
      mockProductService.getProducts.mockResolvedValue([null, []] as any);
      mockProductService.addProduct.mockResolvedValue([
        null,
        makeProduct({ id: "placeholder-1", name: "Integration import item" }),
      ] as any);
      mockTransactionService.saveTransaction.mockResolvedValue([
        null,
        { id: "tx-created" },
      ] as any);
      mockIntegrationRepo.saveIntegrationEvent.mockResolvedValue([
        { id: "event-created" },
      ] as any);

      const [error, result] = await integrationService.importIntegrationTransaction(
        {
          userId: "user-1",
          tokenId: "token-1",
        },
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
            source: "integration",
            needsReview: true,
            description: "Integration import (Apple Pay)",
          }),
          entries: [
            expect.objectContaining({
              product: {
                id: "placeholder-1",
                name: "Integration import item",
              },
              quantity: "1",
              price: "99.90",
              type: "expense",
            }),
          ],
        }),
      );
      expect(mockIntegrationRepo.saveIntegrationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          tokenId: "token-1",
          provider: "apple_pay",
          eventId: "evt-2",
          amount: "99.90",
          transactionId: "tx-created",
          description: "Integration import (Apple Pay)",
        }),
      );
    });
  });
});
