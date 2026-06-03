import z from "zod";
import { integrationProviders } from "./integration.models";

export const createIntegrationTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Token name is required")
    .max(64, "Token name must be at most 64 characters"),
});

export type CreateIntegrationTokenDTO = z.infer<typeof createIntegrationTokenSchema>;

export const revokeIntegrationTokenSchema = z.object({
  tokenId: z.string().uuid("Invalid token id"),
});

export type RevokeIntegrationTokenDTO = z.infer<typeof revokeIntegrationTokenSchema>;

export const importIntegrationTransactionSchema = z.object({
  provider: z.enum(integrationProviders),
  eventId: z.string().trim().min(1, "eventId is required").max(255),
  amount: z.coerce
    .number()
    .finite("amount must be a finite number")
    .gt(0, "amount must be greater than 0"),
  date: z
    .string()
    .datetime({ offset: true, message: "date must include timezone offset" }),
  store: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0 ? undefined : value,
    z.string().trim().min(1).max(255).optional(),
  ),
  description: z.string().trim().min(1).max(500).optional(),
});

export type ImportIntegrationTransactionDTO = z.infer<
  typeof importIntegrationTransactionSchema
>;

export const listIntegrationRequestLogsSchema = z.object({
  tokenId: z.string().uuid().nullable().optional(),
  cursor: z.string().datetime({ offset: true }).nullable().optional(),
  limit: z.coerce.number().int().min(1).max(30).optional(),
});

export type ListIntegrationRequestLogsDTO = z.infer<
  typeof listIntegrationRequestLogsSchema
>;
