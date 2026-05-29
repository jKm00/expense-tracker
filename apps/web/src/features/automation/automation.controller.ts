import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import {
  createAutomationTokenSchema,
  listAutomationRequestLogsSchema,
  revokeAutomationTokenSchema,
} from "./automation.dtos";
import { automationService } from "./automation.service";

const createAutomationToken = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(createAutomationTokenSchema)
  .handler(async ({ context, data }) => {
    return await automationService.createToken(context.user.id, data.name);
  });

const listAutomationTokens = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    return await automationService.listTokens(context.user.id);
  });

const listAutomationRequestLogs = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(listAutomationRequestLogsSchema)
  .handler(async ({ context, data }) => {
    return await automationService.listRequestLogs(context.user.id, data);
  });

const revokeAutomationToken = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(revokeAutomationTokenSchema)
  .handler(async ({ context, data }) => {
    return await automationService.revokeToken(context.user.id, data.tokenId);
  });

export const automationController = {
  createAutomationToken,
  listAutomationTokens,
  listAutomationRequestLogs,
  revokeAutomationToken,
};
