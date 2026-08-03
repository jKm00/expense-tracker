import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../aws";
import { config } from "../config";
import { ApiError, getRequiredHeader, handleError, json } from "../http";
import { getScan } from "../repo";

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const userId = getRequiredHeader(event.headers, "x-user-id");
    const scanId = event.pathParameters?.scanId;
    if (!scanId) throw new ApiError(400, "bad_request", "scanId is required.");
    const scan = await getScan(userId, scanId);
    if (!scan) throw new ApiError(404, "not_found", "Scan was not found.");

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: config.bucketName(), Key: scan.objectKey }),
      { expiresIn: config.fileUrlTtlSeconds() },
    );
    return json(200, { url, expiresAt: Math.floor(Date.now() / 1000) + config.fileUrlTtlSeconds(), contentType: scan.contentType });
  } catch (error) {
    return handleError(error);
  }
}
