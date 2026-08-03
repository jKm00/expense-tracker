import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { ApiError, getRequiredHeader, handleError, json } from "../http";
import { getScan, listScans } from "../repo";

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const userId = getRequiredHeader(event.headers, "x-user-id");
    const scanId = event.pathParameters?.scanId;
    if (!scanId) throw new ApiError(400, "bad_request", "scanId is required.");
    const scan = await getScan(userId, scanId);
    if (!scan) throw new ApiError(404, "not_found", "Scan was not found.");
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, expiresAt, ...body } = scan;
    return json(200, body);
  } catch (error) {
    return handleError(error);
  }
}
