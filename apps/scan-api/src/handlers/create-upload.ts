import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { s3 } from "../aws";
import { config } from "../config";
import { getRequiredHeader, handleError, json, parseJson, ApiError } from "../http";
import { createdSk, scanGsiPk, scanSk, userPk, type ScanRecord } from "../model";
import { reserveDailyScanSlot } from "../repo";
import { createUploadSchema, extensionForContentType } from "../validation";

function todayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const ttl = new Date(end);
  ttl.setDate(ttl.getDate() + 7);
  return { day: start.toISOString(), usageExpiresAt: Math.floor(ttl.getTime() / 1000) };
}

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const userId = getRequiredHeader(event.headers, "x-user-id");
    const data = parseJson(event.body, createUploadSchema);
    if (data.sizeBytes > config.maxFileSizeBytes()) {
      throw new ApiError(400, "bad_request", "Receipt file is too large. Choose an image or PDF under 10 MB.");
    }

    const scanId = randomUUID();
    const now = new Date().toISOString();
    const objectKey = `scans/${scanId}/original.${extensionForContentType(data.contentType)}`;
    const expiresAt = Math.floor(Date.now() / 1000) + config.uploadUrlTtlSeconds();
    const record: ScanRecord = {
      pk: userPk(userId),
      sk: scanSk(scanId),
      gsi1pk: userPk(userId),
      gsi1sk: createdSk(now, scanId),
      gsi2pk: scanGsiPk(scanId),
      scanId,
      userId,
      status: "upload_pending",
      mode: data.mode,
      objectKey,
      fileName: data.fileName,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };
    const uploadHeaders = { "Content-Type": data.contentType };
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: config.bucketName(),
        Key: objectKey,
        ContentType: data.contentType,
        ContentLength: data.sizeBytes,
      }),
      { expiresIn: config.uploadUrlTtlSeconds() },
    );

    const day = todayWindow();
    const reserved = await reserveDailyScanSlot(record, day.day, config.dailyLimit(), day.usageExpiresAt);
    if (!reserved) {
      throw new ApiError(429, "rate_limited", "Receipt scanning is limited to 5 attempts per day.");
    }

    return json(201, { scanId, uploadUrl, uploadHeaders, expiresAt });
  } catch (error) {
    return handleError(error);
  }
}
