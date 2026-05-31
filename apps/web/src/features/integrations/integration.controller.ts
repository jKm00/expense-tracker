import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import {
  createIntegrationTokenSchema,
  listIntegrationRequestLogsSchema,
  revokeIntegrationTokenSchema,
} from "./integration.dtos";
import { integrationService } from "./integration.service";

const createIntegrationToken = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(createIntegrationTokenSchema)
  .handler(async ({ context, data }) => {
    return await integrationService.createToken(context.user.id, data.name);
  });

const listIntegrationTokens = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    return await integrationService.listTokens(context.user.id);
  });

const listIntegrationRequestLogs = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(listIntegrationRequestLogsSchema)
  .handler(async ({ context, data }) => {
    return await integrationService.listRequestLogs(context.user.id, data);
  });

const revokeIntegrationToken = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(revokeIntegrationTokenSchema)
  .handler(async ({ context, data }) => {
    return await integrationService.revokeToken(context.user.id, data.tokenId);
  });

export const integrationController = {
  createIntegrationToken,
  listIntegrationTokens,
  listIntegrationRequestLogs,
  revokeIntegrationToken,
};
