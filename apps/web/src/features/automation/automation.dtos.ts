import z from "zod";
import { automationProviders } from "./automation.models";

export const createAutomationTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Token name is required")
    .max(64, "Token name must be at most 64 characters"),
});

export type CreateAutomationTokenDTO = z.infer<typeof createAutomationTokenSchema>;

export const revokeAutomationTokenSchema = z.object({
  tokenId: z.string().uuid("Invalid token id"),
});

export type RevokeAutomationTokenDTO = z.infer<typeof revokeAutomationTokenSchema>;

export const importAutomationTransactionSchema = z.object({
  provider: z.enum(automationProviders),
  eventId: z.string().trim().min(1, "eventId is required").max(255),
  amount: z.coerce
    .number()
    .finite("amount must be a finite number")
    .gt(0, "amount must be greater than 0"),
  date: z
    .string()
    .datetime({ offset: true, message: "date must include timezone offset" }),
  store: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().min(1).max(500).optional(),
});

export type ImportAutomationTransactionDTO = z.infer<
  typeof importAutomationTransactionSchema
>;
