import { productService } from "@/features/products/products.service";
import { transactionService } from "@/features/transactions/transactions.service";
import { err, ok } from "@/utils/result";
import { createHash, randomBytes } from "node:crypto";
import {
  AutomationRequestLogPage,
  AutomationProvider,
  AutomationToken,
  AutomationTokenMetadata,
} from "./automation.models";
import {
  ImportAutomationTransactionDTO,
  ListAutomationRequestLogsDTO,
} from "./automation.dtos";
import { automationRepo } from "./automation.repo";

const MAX_ACTIVE_TOKENS = 10;
const TOKEN_PREFIX_LENGTH = 4;
const PLACEHOLDER_PRODUCT_NAME = "Automation import item";

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

function toTokenMetadata(token: AutomationToken): AutomationTokenMetadata {
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

function getDefaultDescription(provider: AutomationProvider) {
  switch (provider) {
    case "apple_pay":
      return "Automation import (Apple Pay)";
  }
}

async function resolvePlaceholderProduct(userId: string) {
  const [productsError, products] = await productService.getProducts(userId);
  if (productsError) {
    return err({
      reason: "AUTOMATION_PLACEHOLDER_PRODUCT_ERROR" as const,
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
      reason: "AUTOMATION_PLACEHOLDER_PRODUCT_ERROR" as const,
      message: "Failed to create placeholder product",
    });
  }

  return ok(created);
}

function formatAutomationErrorMessage(error: { reason: string }) {
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
      return "Failed to create transaction from automation import";
    default:
      return "Failed to create transaction from automation import";
  }
}

async function verifyBearerToken(authorizationHeader: string | null) {
  return await resolveBearerTokenContext(authorizationHeader);
}

async function resolveBearerTokenContext(
  authorizationHeader: string | null,
  options?: { touchLastUsed?: boolean },
) {
  const rawToken = parseBearerToken(authorizationHeader);
  if (!rawToken) {
    return err({
      reason: "AUTOMATION_UNAUTHORIZED" as const,
      message: "Unauthorized",
    });
  }

  const tokenHash = hashToken(rawToken);

  let token: Awaited<ReturnType<typeof automationRepo.getTokenByHash>>;
  try {
    token = await automationRepo.getTokenByHash(tokenHash);
  } catch (error) {
    return err({
      reason: "AUTOMATION_UNAUTHORIZED" as const,
      message: "Unauthorized",
    });
  }

  if (!token || token.revokedAt) {
    return err({
      reason: "AUTOMATION_UNAUTHORIZED" as const,
      message: "Unauthorized",
    });
  }

  if (options?.touchLastUsed ?? true) {
    try {
      await automationRepo.touchTokenLastUsed(token.id);
    } catch {
      // Best effort metadata update.
    }
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
    activeTokenCount = await automationRepo.countActiveTokens(userId);
  } catch {
    return err({
      reason: "AUTOMATION_TOKEN_CREATE_ERROR" as const,
      message: "Failed to create automation token",
    });
  }

  if (activeTokenCount >= MAX_ACTIVE_TOKENS) {
    return err({
      reason: "AUTOMATION_TOKEN_LIMIT_REACHED" as const,
      message: "You have reached the maximum number of active automation tokens",
    });
  }

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = rawToken.slice(0, TOKEN_PREFIX_LENGTH);

  let createdTokens: Awaited<ReturnType<typeof automationRepo.saveToken>>;
  try {
    createdTokens = await automationRepo.saveToken({
      userId,
      name: tokenName,
      tokenHash,
      tokenPrefix,
    });
  } catch {
    return err({
      reason: "AUTOMATION_TOKEN_CREATE_ERROR" as const,
      message: "Failed to create automation token",
    });
  }

  if (createdTokens.length === 0) {
    return err({
      reason: "AUTOMATION_TOKEN_CREATE_ERROR" as const,
      message: "Failed to create automation token",
    });
  }

  return ok({
    token: rawToken,
    metadata: toTokenMetadata(createdTokens[0]),
  });
}

async function listTokens(userId: string) {
  try {
    const tokens = await automationRepo.getTokensByUser(userId);
    return ok(tokens.map(toTokenMetadata));
  } catch {
    return err({
      reason: "AUTOMATION_TOKENS_FETCH_ERROR" as const,
      message: "Failed to fetch automation tokens",
    });
  }
}

async function listRequestLogs(
  userId: string,
  input: ListAutomationRequestLogsDTO,
) {
  const limit = input.limit ?? 25;
  const cursor = input.cursor ? new Date(input.cursor) : null;

  if (cursor && Number.isNaN(cursor.getTime())) {
    return err({
      reason: "AUTOMATION_REQUEST_LOGS_FETCH_ERROR" as const,
      message: "Failed to fetch automation request logs",
    });
  }

  try {
    const logs = await automationRepo.getAutomationRequestLogsByUser({
      userId,
      tokenId: input.tokenId ?? null,
      cursor,
      limit: limit + 1,
    });

    const pageLogs = logs.slice(0, limit);
    const hasMore = logs.length > limit;
    const nextCursor = hasMore
      ? pageLogs[pageLogs.length - 1]?.createdAt.toISOString() ?? null
      : null;

    return ok<AutomationRequestLogPage>({
      logs: pageLogs,
      hasMore,
      nextCursor,
    });
  } catch {
    return err({
      reason: "AUTOMATION_REQUEST_LOGS_FETCH_ERROR" as const,
      message: "Failed to fetch automation request logs",
    });
  }
}

async function logAutomationRequest(input: {
  userId: string;
  tokenId?: string | null;
  transactionId?: string | null;
  requestTokenPrefix?: string | null;
  requestMethod: string;
  requestPath: string;
  provider?: AutomationProvider | null;
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
    await automationRepo.saveAutomationRequestLog({
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

async function revokeToken(userId: string, tokenId: string) {
  let token: Awaited<ReturnType<typeof automationRepo.getTokenById>>;
  try {
    token = await automationRepo.getTokenById(tokenId);
  } catch {
    return err({
      reason: "AUTOMATION_TOKEN_REVOKE_ERROR" as const,
      message: "Failed to revoke automation token",
    });
  }

  if (!token) {
    return err({
      reason: "AUTOMATION_TOKEN_NOT_FOUND" as const,
      message: "Automation token not found",
    });
  }

  if (token.userId !== userId) {
    return err({
      reason: "AUTOMATION_TOKEN_UNAUTHORIZED" as const,
      message: "You do not have permission to revoke this token",
    });
  }

  if (token.revokedAt) {
    return ok(toTokenMetadata(token));
  }

  try {
    const revoked = await automationRepo.revokeToken(tokenId);
    if (revoked.length === 0) {
      return err({
        reason: "AUTOMATION_TOKEN_REVOKE_ERROR" as const,
        message: "Failed to revoke automation token",
      });
    }

    return ok(toTokenMetadata(revoked[0]));
  } catch {
    return err({
      reason: "AUTOMATION_TOKEN_REVOKE_ERROR" as const,
      message: "Failed to revoke automation token",
    });
  }
}

async function importAutomationTransaction(
  authorizationHeader: string | null,
  payload: ImportAutomationTransactionDTO,
) {
  const [authError, authContext] = await verifyBearerToken(authorizationHeader);
  if (authError) {
    return err(authError);
  }

  const normalizedAmount = payload.amount.toFixed(2);
  const normalizedDate = new Date(payload.date);
  const normalizedStore = payload.store ?? null;
  const normalizedDescription =
    payload.description ?? getDefaultDescription(payload.provider);

  if (Number.isNaN(normalizedDate.getTime())) {
    return err({
      reason: "AUTOMATION_IMPORT_VALIDATION_ERROR" as const,
      message: "Invalid date payload",
    });
  }

  let existingEvent: Awaited<
    ReturnType<typeof automationRepo.getAutomationEventByDedupeKey>
  >;
  try {
    existingEvent = await automationRepo.getAutomationEventByDedupeKey(
      authContext.userId,
      payload.provider,
      payload.eventId,
    );
  } catch {
    return err({
      reason: "AUTOMATION_IMPORT_EVENT_ERROR" as const,
      message: "Failed to resolve automation event",
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
        reason: "AUTOMATION_IMPORT_CONFLICT" as const,
        message: "Automation event already exists with different payload",
      });
    }

    return ok({
      duplicate: true,
      transactionId: existingEvent.transactionId,
    });
  }

  const [placeholderError, placeholderProduct] = await resolvePlaceholderProduct(
    authContext.userId,
  );
  if (placeholderError) {
    return err(placeholderError);
  }

  const [transactionError, transaction] = await transactionService.saveTransaction(
    {
      transaction: {
        userId: authContext.userId,
        source: "automation",
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
    },
  );

  if (transactionError) {
    return err({
      reason: "AUTOMATION_IMPORT_TRANSACTION_ERROR" as const,
      message: formatAutomationErrorMessage(transactionError),
    });
  }

  try {
    const savedEvents = await automationRepo.saveAutomationEvent({
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
        reason: "AUTOMATION_IMPORT_EVENT_ERROR" as const,
        message: "Failed to persist automation event",
      });
    }
  } catch {
    return err({
      reason: "AUTOMATION_IMPORT_EVENT_ERROR" as const,
      message: "Failed to persist automation event",
    });
  }

  return ok({
    duplicate: false,
    transactionId: transaction.id,
  });
}

export const automationService = {
  createToken,
  listTokens,
  listRequestLogs,
  logAutomationRequest,
  revokeToken,
  resolveBearerTokenContext,
  verifyBearerToken,
  toRequestTokenPrefix,
  importAutomationTransaction,
};
