import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import {
  createAutomationTokenSchema,
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

const revokeAutomationToken = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(revokeAutomationTokenSchema)
  .handler(async ({ context, data }) => {
    return await automationService.revokeToken(context.user.id, data.tokenId);
  });

export const automationController = {
  createAutomationToken,
  listAutomationTokens,
  revokeAutomationToken,
};
