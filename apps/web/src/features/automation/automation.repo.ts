import { db } from "@/lib/db";
import {
  automationEvents,
  automationRequestLogs,
  automationTokens,
} from "@/lib/db/schema";
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import {
  AutomationProvider,
  NewAutomationRequestLog,
  NewAutomationEvent,
  NewAutomationToken,
} from "./automation.models";

async function countActiveTokens(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(automationTokens)
    .where(
      and(
        eq(automationTokens.userId, userId),
        isNull(automationTokens.revokedAt),
      ),
    );

  return Number(result?.count ?? 0);
}

async function saveToken(token: NewAutomationToken) {
  return await db.insert(automationTokens).values(token).returning();
}

async function getTokenById(tokenId: string) {
  const [token] = await db
    .select()
    .from(automationTokens)
    .where(eq(automationTokens.id, tokenId))
    .limit(1);

  return token;
}

async function getTokenByHash(tokenHash: string) {
  const [token] = await db
    .select()
    .from(automationTokens)
    .where(eq(automationTokens.tokenHash, tokenHash))
    .limit(1);

  return token;
}

async function getTokensByUser(userId: string) {
  return await db
    .select()
    .from(automationTokens)
    .where(eq(automationTokens.userId, userId))
    .orderBy(desc(automationTokens.createdAt));
}

async function revokeToken(tokenId: string) {
  return await db
    .update(automationTokens)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(automationTokens.id, tokenId))
    .returning();
}

async function touchTokenLastUsed(tokenId: string) {
  return await db
    .update(automationTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(automationTokens.id, tokenId))
    .returning();
}

async function getAutomationEventByDedupeKey(
  userId: string,
  provider: AutomationProvider,
  eventId: string,
) {
  const [event] = await db
    .select()
    .from(automationEvents)
    .where(
      and(
        eq(automationEvents.userId, userId),
        eq(automationEvents.provider, provider),
        eq(automationEvents.eventId, eventId),
      ),
    )
    .limit(1);

  return event;
}

async function saveAutomationEvent(event: NewAutomationEvent) {
  return await db.insert(automationEvents).values(event).returning();
}

async function saveAutomationRequestLog(log: NewAutomationRequestLog) {
  return await db.insert(automationRequestLogs).values(log).returning();
}

async function getAutomationRequestLogsByUser(options: {
  userId: string;
  tokenId?: string | null;
  cursor?: Date | null;
  limit: number;
}) {
  const filters = [eq(automationRequestLogs.userId, options.userId)] as Array<
    ReturnType<typeof eq> | ReturnType<typeof lt>
  >;

  if (options.tokenId) {
    filters.push(eq(automationRequestLogs.tokenId, options.tokenId));
  }

  if (options.cursor) {
    filters.push(lt(automationRequestLogs.createdAt, options.cursor));
  }

  return await db
    .select({
      id: automationRequestLogs.id,
      tokenId: automationRequestLogs.tokenId,
      tokenName: automationTokens.name,
      tokenPrefix: automationTokens.tokenPrefix,
      requestTokenPrefix: automationRequestLogs.requestTokenPrefix,
      requestMethod: automationRequestLogs.requestMethod,
      requestPath: automationRequestLogs.requestPath,
      provider: automationRequestLogs.provider,
      eventId: automationRequestLogs.eventId,
      requestBody: automationRequestLogs.requestBody,
      userAgent: automationRequestLogs.userAgent,
      ipAddress: automationRequestLogs.ipAddress,
      responseStatus: automationRequestLogs.responseStatus,
      responseMessage: automationRequestLogs.responseMessage,
      responseBody: automationRequestLogs.responseBody,
      errorReason: automationRequestLogs.errorReason,
      duplicate: automationRequestLogs.duplicate,
      durationMs: automationRequestLogs.durationMs,
      transactionId: automationRequestLogs.transactionId,
      createdAt: automationRequestLogs.createdAt,
    })
    .from(automationRequestLogs)
    .leftJoin(
      automationTokens,
      eq(automationRequestLogs.tokenId, automationTokens.id),
    )
    .where(and(...filters))
    .orderBy(desc(automationRequestLogs.createdAt), desc(automationRequestLogs.id))
    .limit(options.limit);
}

export const automationRepo = {
  countActiveTokens,
  saveToken,
  getTokenById,
  getTokenByHash,
  getTokensByUser,
  revokeToken,
  touchTokenLastUsed,
  getAutomationEventByDedupeKey,
  saveAutomationEvent,
  saveAutomationRequestLog,
  getAutomationRequestLogsByUser,
};
