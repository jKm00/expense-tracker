import { productService } from "@/features/products/products.service";
import { transactionService } from "@/features/transactions/transactions.service";
import { err, ok } from "@/utils/result";
import { createHash, randomBytes } from "node:crypto";
import {
  IntegrationRequestLogPage,
  IntegrationProvider,
  IntegrationToken,
  IntegrationTokenMetadata,
} from "./integration.models";
import {
  ImportIntegrationTransactionDTO,
  ListIntegrationRequestLogsDTO,
} from "./integration.dtos";
import { integrationRepo } from "./integration.repo";

const MAX_ACTIVE_TOKENS = 10;
const TOKEN_PREFIX_LENGTH = 4;
const PLACEHOLDER_PRODUCT_NAME = "Integration import item";

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function createRawToken() {
  return randomBytes(32).toString("hex");
}

function parseBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

function toRequestTokenPrefix(authorizationHeader: string | null) {
  const rawToken = parseBearerToken(authorizationHeader);
  if (!rawToken) {
    return null;
  }

  return rawToken.slice(0, TOKEN_PREFIX_LENGTH) || null;
}

function toTokenMetadata(token: IntegrationToken): IntegrationTokenMetadata {
  return {
    id: token.id,
    name: token.name,
    tokenPrefix: token.tokenPrefix,
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
    lastUsedAt: token.lastUsedAt,
    revokedAt: token.revokedAt,
  };
}

function getDefaultDescription(provider: IntegrationProvider) {
  switch (provider) {
    case "apple_pay":
      return "Integration import (Apple Pay)";
  }
}

async function resolvePlaceholderProduct(userId: string) {
  const [productsError, products] = await productService.getProducts(userId);
  if (productsError) {
    return err({
      reason: "INTEGRATION_PLACEHOLDER_PRODUCT_ERROR" as const,
      message: "Failed to load products when resolving placeholder product",
    });
  }

  const existing = products.find(
    (product) => product.name === PLACEHOLDER_PRODUCT_NAME,
  );
  if (existing) {
    return ok(existing);
  }

  const [createError, created] = await productService.addProduct({
    userId,
    name: PLACEHOLDER_PRODUCT_NAME,
  });
  if (createError) {
    return err({
      reason: "INTEGRATION_PLACEHOLDER_PRODUCT_ERROR" as const,
      message: "Failed to create placeholder product",
    });
  }

  return ok(created);
}

function formatIntegrationErrorMessage(error: { reason: string }) {
  switch (error.reason) {
    case "PRODUCT_NOT_FOUND":
    case "PRODUCT_UNAUTHORIZED":
    case "PRODUCT_DB_ERROR":
    case "UNEXPECTED_DB_ERROR":
    case "SAVE_TRANSACTION_ERROR":
    case "SAVE_TRANSACTION_NO_RETURNING":
    case "SAVE_ENTRY_NO_RETURNING":
    case "SAVE_ENTRY_TAG_ERROR":
    case "TAG_UNATHORIZED":
    case "TAG_NOT_FOUND":
    case "TAG_DB_ERROR":
      return "Failed to create transaction from integration import";
    default:
      return "Failed to create transaction from integration import";
  }
}

async function verifyBearerToken(authorizationHeader: string | null) {
  return await resolveBearerTokenContext(authorizationHeader);
}

async function resolveBearerTokenContext(authorizationHeader: string | null) {
  const rawToken = parseBearerToken(authorizationHeader);
  if (!rawToken) {
    return err({
      reason: "INTEGRATION_NO_TOKEN" as const,
      message: "Missing or malformed bearer token",
    });
  }

  const tokenHash = hashToken(rawToken);

  let token: Awaited<ReturnType<typeof integrationRepo.getTokenByHash>>;
  try {
    token = await integrationRepo.getTokenByHash(tokenHash);
  } catch {
    return err({
      reason: "INTEGRATION_DB_ERROR" as const,
      message: "Bearer token is invalid or no longer active",
    });
  }

  if (!token) {
    return err({
      reason: "INTEGRATION_TOKEN_NOT_FOUND" as const,
      message: "Bearer token is invalid",
    });
  }

  if (token.revokedAt) {
    return err({
      reason: "INTEGRATION_TOKEN_REVOKED" as const,
      message: "Token has been revoked and can no longer be used",
      userId: token.userId,
      tokenId: token.id,
    });
  }

  try {
    await integrationRepo.touchTokenLastUsed(token.id);
  } catch {
    // Best effort metadata update.
  }

  return ok({
    userId: token.userId,
    tokenId: token.id,
  });
}

async function createToken(userId: string, name: string) {
  const tokenName = name.trim();

  let activeTokenCount: number;
  try {
    activeTokenCount = await integrationRepo.countActiveTokens(userId);
  } catch {
    return err({
      reason: "INTEGRATION_TOKEN_CREATE_ERROR" as const,
      message: "Failed to create integration token",
    });
  }

  if (activeTokenCount >= MAX_ACTIVE_TOKENS) {
    return err({
      reason: "INTEGRATION_TOKEN_LIMIT_REACHED" as const,
      message:
        "You have reached the maximum number of active integration tokens",
    });
  }

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = rawToken.slice(0, TOKEN_PREFIX_LENGTH);

  let createdTokens: Awaited<ReturnType<typeof integrationRepo.saveToken>>;
  try {
    createdTokens = await integrationRepo.saveToken({
      userId,
      name: tokenName,
      tokenHash,
      tokenPrefix,
    });
  } catch {
    return err({
      reason: "INTEGRATION_TOKEN_CREATE_ERROR" as const,
      message: "Failed to create integration token",
    });
  }

  if (createdTokens.length === 0) {
    return err({
      reason: "INTEGRATION_TOKEN_CREATE_ERROR" as const,
      message: "Failed to create integration token",
    });
  }

  return ok({
    token: rawToken,
    metadata: toTokenMetadata(createdTokens[0]),
  });
}

async function listTokens(userId: string) {
  try {
    const tokens = await integrationRepo.getTokensByUser(userId);
    return ok(tokens.map(toTokenMetadata));
  } catch {
    return err({
      reason: "INTEGRATION_TOKENS_FETCH_ERROR" as const,
      message: "Failed to fetch integration tokens",
    });
  }
}

async function listRequestLogs(
  userId: string,
  input: ListIntegrationRequestLogsDTO,
) {
  const limit = input.limit ?? 25;
  const cursor = input.cursor ? new Date(input.cursor) : null;

  if (cursor && Number.isNaN(cursor.getTime())) {
    return err({
      reason: "INTEGRATION_REQUEST_LOGS_FETCH_ERROR" as const,
      message: "Failed to fetch integration request logs",
    });
  }

  try {
    const logs = await integrationRepo.getIntegrationRequestLogsByUser({
      userId,
      tokenId: input.tokenId ?? null,
      cursor,
      limit: limit + 1,
    });

    const pageLogs = logs.slice(0, limit);
    const hasMore = logs.length > limit;
    const nextCursor = hasMore
      ? (pageLogs[pageLogs.length - 1]?.createdAt.toISOString() ?? null)
      : null;

    return ok<IntegrationRequestLogPage>({
      logs: pageLogs,
      hasMore,
      nextCursor,
    });
  } catch {
    return err({
      reason: "INTEGRATION_REQUEST_LOGS_FETCH_ERROR" as const,
      message: "Failed to fetch integration request logs",
    });
  }
}

async function logIntegrationRequest(input: {
  userId: string;
  tokenId?: string | null;
  transactionId?: string | null;
  requestTokenPrefix?: string | null;
  requestMethod: string;
  requestPath: string;
  provider?: IntegrationProvider | null;
  eventId?: string | null;
  requestBody?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  responseStatus: number;
  responseMessage: string;
  responseBody?: string | null;
  errorReason?: string | null;
  duplicate?: boolean;
  durationMs?: number | null;
}) {
  try {
    await integrationRepo.saveIntegrationRequestLog({
      userId: input.userId,
      tokenId: input.tokenId ?? null,
      transactionId: input.transactionId ?? null,
      requestTokenPrefix: input.requestTokenPrefix ?? null,
      requestMethod: input.requestMethod,
      requestPath: input.requestPath,
      provider: input.provider ?? null,
      eventId: input.eventId ?? null,
      requestBody: input.requestBody ?? null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      responseStatus: input.responseStatus,
      responseMessage: input.responseMessage,
      responseBody: input.responseBody ?? null,
      errorReason: input.errorReason ?? null,
      duplicate: input.duplicate ?? false,
      durationMs: input.durationMs ?? null,
    });
  } catch {
    // Logging must not affect the request lifecycle.
  }
}

async function touchTokenLastUsed(tokenId: string) {
  try {
    await integrationRepo.touchTokenLastUsed(tokenId);
  } catch {
    // Best effort metadata update.
  }
}

async function revokeToken(userId: string, tokenId: string) {
  let token: Awaited<ReturnType<typeof integrationRepo.getTokenById>>;
  try {
    token = await integrationRepo.getTokenById(tokenId);
  } catch {
    return err({
      reason: "INTEGRATION_TOKEN_REVOKE_ERROR" as const,
      message: "Failed to revoke integration token",
    });
  }

  if (!token) {
    return err({
      reason: "INTEGRATION_TOKEN_NOT_FOUND" as const,
      message: "Integration token not found",
    });
  }

  if (token.userId !== userId) {
    return err({
      reason: "INTEGRATION_TOKEN_UNAUTHORIZED" as const,
      message: "You do not have permission to revoke this token",
    });
  }

  if (token.revokedAt) {
    return ok(toTokenMetadata(token));
  }

  try {
    const revoked = await integrationRepo.revokeToken(tokenId);
    if (revoked.length === 0) {
      return err({
        reason: "INTEGRATION_TOKEN_REVOKE_ERROR" as const,
        message: "Failed to revoke integration token",
      });
    }

    return ok(toTokenMetadata(revoked[0]));
  } catch {
    return err({
      reason: "INTEGRATION_TOKEN_REVOKE_ERROR" as const,
      message: "Failed to revoke integration token",
    });
  }
}

async function importIntegrationTransaction(
  authContext: {
    userId: string;
    tokenId: string;
  },
  payload: ImportIntegrationTransactionDTO,
) {
  const normalizedAmount = payload.amount.toFixed(2);
  const normalizedDate = new Date(payload.date);
  const normalizedStore = payload.store ?? null;
  const normalizedDescription =
    payload.description ?? getDefaultDescription(payload.provider);

  if (Number.isNaN(normalizedDate.getTime())) {
    return err({
      reason: "INTEGRATION_IMPORT_VALIDATION_ERROR" as const,
      message: "Invalid date payload",
    });
  }

  let existingEvent: Awaited<
    ReturnType<typeof integrationRepo.getIntegrationEventByDedupeKey>
  >;
  try {
    existingEvent = await integrationRepo.getIntegrationEventByDedupeKey(
      authContext.userId,
      payload.provider,
      payload.eventId,
    );
  } catch {
    return err({
      reason: "INTEGRATION_IMPORT_EVENT_ERROR" as const,
      message: "Failed to resolve integration event",
    });
  }

  if (existingEvent) {
    const isSamePayload =
      Number(existingEvent.amount).toFixed(2) === normalizedAmount &&
      existingEvent.date.getTime() === normalizedDate.getTime() &&
      (existingEvent.store ?? null) === normalizedStore &&
      (existingEvent.description ?? null) === normalizedDescription;

    if (!isSamePayload) {
      return err({
        reason: "INTEGRATION_IMPORT_CONFLICT" as const,
        message: "Integration event already exists with different payload",
      });
    }

    return ok({
      duplicate: true,
      transactionId: existingEvent.transactionId,
    });
  }

  const [placeholderError, placeholderProduct] =
    await resolvePlaceholderProduct(authContext.userId);
  if (placeholderError) {
    return err(placeholderError);
  }

  const [transactionError, transaction] =
    await transactionService.saveTransaction({
      transaction: {
        userId: authContext.userId,
        source: "integration",
        needsReview: true,
        store: normalizedStore,
        description: normalizedDescription,
        date: normalizedDate,
      },
      entries: [
        {
          product: {
            id: placeholderProduct.id,
            name: placeholderProduct.name,
          },
          quantity: "1",
          price: normalizedAmount,
          type: "expense",
          tagIds: [],
        },
      ],
    });

  if (transactionError) {
    return err({
      reason: "INTEGRATION_IMPORT_TRANSACTION_ERROR" as const,
      message: formatIntegrationErrorMessage(transactionError),
    });
  }

  try {
    const savedEvents = await integrationRepo.saveIntegrationEvent({
      userId: authContext.userId,
      tokenId: authContext.tokenId,
      provider: payload.provider,
      eventId: payload.eventId,
      amount: normalizedAmount,
      date: normalizedDate,
      store: normalizedStore,
      description: normalizedDescription,
      transactionId: transaction.id,
    });

    if (savedEvents.length === 0) {
      return err({
        reason: "INTEGRATION_IMPORT_EVENT_ERROR" as const,
        message: "Failed to persist integration event",
      });
    }
  } catch {
    return err({
      reason: "INTEGRATION_IMPORT_EVENT_ERROR" as const,
      message: "Failed to persist integration event",
    });
  }

  return ok({
    duplicate: false,
    transactionId: transaction.id,
  });
}

export const integrationService = {
  createToken,
  listTokens,
  listRequestLogs,
  logIntegrationRequest,
  revokeToken,
  resolveBearerTokenContext,
  touchTokenLastUsed,
  verifyBearerToken,
  toRequestTokenPrefix,
  importIntegrationTransaction,
};
