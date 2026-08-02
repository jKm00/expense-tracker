import type { APIGatewayRequestAuthorizerEventV2, APIGatewaySimpleAuthorizerResult } from "aws-lambda";
import { config } from "../config";

export async function handler(event: APIGatewayRequestAuthorizerEventV2): Promise<APIGatewaySimpleAuthorizerResult> {
  const header = event.headers?.authorization ?? event.headers?.Authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  return { isAuthorized: token === config.apiToken() };
}
