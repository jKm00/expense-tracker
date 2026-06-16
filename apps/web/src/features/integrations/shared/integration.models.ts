import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  integrationEvents,
  integrationRequestLogs,
  integrationTokens,
} from "@/features/integrations/server/integration.schema";

export const integrationProviders = ["apple_pay"] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];

export type IntegrationToken = InferSelectModel<typeof integrationTokens>;
export type NewIntegrationToken = InferInsertModel<typeof integrationTokens>;

export type NewIntegrationEvent = InferInsertModel<typeof integrationEvents>;

export type NewIntegrationRequestLog = InferInsertModel<
  typeof integrationRequestLogs
>;

export type IntegrationTokenMetadata = Pick<
  IntegrationToken,
  | "id"
  | "name"
  | "tokenPrefix"
  | "createdAt"
  | "updatedAt"
  | "lastUsedAt"
  | "revokedAt"
>;

export type IntegrationRequestLogListItem = {
  id: string;
  tokenId: string | null;
  tokenName: string | null;
  tokenPrefix: string | null;
  requestTokenPrefix: string | null;
  requestMethod: string;
  requestPath: string;
  provider: IntegrationProvider | null;
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

export type IntegrationRequestLogPage = {
  logs: IntegrationRequestLogListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
