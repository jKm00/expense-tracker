import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  automationEvents,
  automationRequestLogs,
  automationTokens,
} from "./automation.schema";

export const automationProviders = ["apple_pay"] as const;
export type AutomationProvider = (typeof automationProviders)[number];

export type AutomationToken = InferSelectModel<typeof automationTokens>;
export type NewAutomationToken = InferInsertModel<typeof automationTokens>;

export type AutomationEvent = InferSelectModel<typeof automationEvents>;
export type NewAutomationEvent = InferInsertModel<typeof automationEvents>;

export type AutomationRequestLog = InferSelectModel<typeof automationRequestLogs>;
export type NewAutomationRequestLog = InferInsertModel<typeof automationRequestLogs>;

export type AutomationTokenMetadata = Pick<
  AutomationToken,
  | "id"
  | "name"
  | "tokenPrefix"
  | "createdAt"
  | "updatedAt"
  | "lastUsedAt"
  | "revokedAt"
>;

export type AutomationRequestLogListItem = {
  id: string;
  tokenId: string | null;
  tokenName: string | null;
  tokenPrefix: string | null;
  requestTokenPrefix: string | null;
  requestMethod: string;
  requestPath: string;
  provider: AutomationProvider | null;
  eventId: string | null;
  requestBody: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  responseStatus: number;
  responseMessage: string;
  responseBody: string | null;
  errorReason: string | null;
  duplicate: boolean;
  durationMs: number | null;
  transactionId: string | null;
  createdAt: Date;
};

export type AutomationRequestLogPage = {
  logs: AutomationRequestLogListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
