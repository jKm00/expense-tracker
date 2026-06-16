import { db } from "@/lib/db";
import {
  integrationEvents,
  integrationRequestLogs,
  integrationTokens,
} from "@/lib/db/schema";
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import {
  IntegrationProvider,
  NewIntegrationRequestLog,
  NewIntegrationEvent,
  NewIntegrationToken,
} from "@/features/integrations/shared/integration.models";

async function countActiveTokens(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, userId),
        isNull(integrationTokens.revokedAt),
      ),
    );

  return Number(result?.count ?? 0);
}

async function saveToken(token: NewIntegrationToken) {
  return await db.insert(integrationTokens).values(token).returning();
}

async function getTokenById(tokenId: string) {
  const [token] = await db
    .select()
    .from(integrationTokens)
    .where(eq(integrationTokens.id, tokenId))
    .limit(1);

  return token;
}

async function getTokenByHash(tokenHash: string) {
  const [token] = await db
    .select()
    .from(integrationTokens)
    .where(eq(integrationTokens.tokenHash, tokenHash))
    .limit(1);

  return token;
}

async function getTokensByUser(userId: string) {
  return await db
    .select()
    .from(integrationTokens)
    .where(eq(integrationTokens.userId, userId))
    .orderBy(desc(integrationTokens.createdAt));
}

async function revokeToken(tokenId: string) {
  return await db
    .update(integrationTokens)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(integrationTokens.id, tokenId))
    .returning();
}

async function touchTokenLastUsed(tokenId: string) {
  return await db
    .update(integrationTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(integrationTokens.id, tokenId))
    .returning();
}

async function getIntegrationEventByDedupeKey(
  userId: string,
  provider: IntegrationProvider,
  eventId: string,
) {
  const [event] = await db
    .select()
    .from(integrationEvents)
    .where(
      and(
        eq(integrationEvents.userId, userId),
        eq(integrationEvents.provider, provider),
        eq(integrationEvents.eventId, eventId),
      ),
    )
    .limit(1);

  return event;
}

async function saveIntegrationEvent(event: NewIntegrationEvent) {
  return await db.insert(integrationEvents).values(event).returning();
}

async function saveIntegrationRequestLog(log: NewIntegrationRequestLog) {
  return await db.insert(integrationRequestLogs).values(log).returning();
}

async function getIntegrationRequestLogsByUser(options: {
  userId: string;
  tokenId?: string | null;
  cursor?: Date | null;
  limit: number;
}) {
  const filters = [eq(integrationRequestLogs.userId, options.userId)] as Array<
    ReturnType<typeof eq> | ReturnType<typeof lt>
  >;

  if (options.tokenId) {
    filters.push(eq(integrationRequestLogs.tokenId, options.tokenId));
  }

  if (options.cursor) {
    filters.push(lt(integrationRequestLogs.createdAt, options.cursor));
  }

  return await db
    .select({
      id: integrationRequestLogs.id,
      tokenId: integrationRequestLogs.tokenId,
      tokenName: integrationTokens.name,
      tokenPrefix: integrationTokens.tokenPrefix,
      requestTokenPrefix: integrationRequestLogs.requestTokenPrefix,
      requestMethod: integrationRequestLogs.requestMethod,
      requestPath: integrationRequestLogs.requestPath,
      provider: integrationRequestLogs.provider,
      eventId: integrationRequestLogs.eventId,
      requestBody: integrationRequestLogs.requestBody,
      userAgent: integrationRequestLogs.userAgent,
      ipAddress: integrationRequestLogs.ipAddress,
      responseStatus: integrationRequestLogs.responseStatus,
      responseMessage: integrationRequestLogs.responseMessage,
      responseBody: integrationRequestLogs.responseBody,
      errorReason: integrationRequestLogs.errorReason,
      duplicate: integrationRequestLogs.duplicate,
      durationMs: integrationRequestLogs.durationMs,
      transactionId: integrationRequestLogs.transactionId,
      createdAt: integrationRequestLogs.createdAt,
    })
    .from(integrationRequestLogs)
    .leftJoin(
      integrationTokens,
      eq(integrationRequestLogs.tokenId, integrationTokens.id),
    )
    .where(and(...filters))
    .orderBy(desc(integrationRequestLogs.createdAt), desc(integrationRequestLogs.id))
    .limit(options.limit);
}

export const integrationRepo = {
  countActiveTokens,
  saveToken,
  getTokenById,
  getTokenByHash,
  getTokensByUser,
  revokeToken,
  touchTokenLastUsed,
  getIntegrationEventByDedupeKey,
  saveIntegrationEvent,
  saveIntegrationRequestLog,
  getIntegrationRequestLogsByUser,
};
