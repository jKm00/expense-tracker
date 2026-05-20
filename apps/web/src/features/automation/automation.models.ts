import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { automationEvents, automationTokens } from "./automation.schema";

export const automationProviders = ["apple_pay"] as const;
export type AutomationProvider = (typeof automationProviders)[number];

export type AutomationToken = InferSelectModel<typeof automationTokens>;
export type NewAutomationToken = InferInsertModel<typeof automationTokens>;

export type AutomationEvent = InferSelectModel<typeof automationEvents>;
export type NewAutomationEvent = InferInsertModel<typeof automationEvents>;

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
