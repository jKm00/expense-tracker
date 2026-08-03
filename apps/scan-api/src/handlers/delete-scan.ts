import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../aws";
import { config } from "../config";
import { ApiError, getRequiredHeader, handleError, json } from "../http";
import { deleteScan, getScan } from "../repo";

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const userId = getRequiredHeader(event.headers, "x-user-id");
    const scanId = event.pathParameters?.scanId;
    if (!scanId) throw new ApiError(400, "bad_request", "scanId is required.");
    const scan = await getScan(userId, scanId);
    if (!scan) throw new ApiError(404, "not_found", "Scan was not found.");
    if (scan.status === "processing") {
      throw new ApiError(409, "conflict", "This scan is being processed and cannot be deleted yet.");
    }
    await s3.send(new DeleteObjectCommand({ Bucket: config.bucketName(), Key: scan.objectKey }));
    await deleteScan(scan);
    return json(204, null);
  } catch (error) {
    return handleError(error);
  }
}
