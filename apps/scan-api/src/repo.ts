import { DeleteCommand, GetCommand, PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { NativeAttributeValue } from "@aws-sdk/util-dynamodb";
import { config } from "./config";
import { dynamodb } from "./aws";
import { createdSk, dailyUsageSk, DailyUsageRecord, ScanRecord, scanGsiPk, scanSk, userPk } from "./model";

export type Cursor = Record<string, NativeAttributeValue>;

export async function putScan(record: ScanRecord) {
  await dynamodb.send(new PutCommand({ TableName: config.tableName(), Item: record }));
}

export async function reserveDailyScanSlot(record: ScanRecord, day: string, dailyLimit: number, usageExpiresAt: number) {
  try {
    await dynamodb.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: config.tableName(),
            Key: { pk: userPk(record.userId), sk: dailyUsageSk(day) },
            ConditionExpression: "attribute_not_exists(used) or used < :limit",
            UpdateExpression: "set userId = :userId, #day = :day, used = if_not_exists(used, :zero) + :one, updatedAt = :updatedAt, expiresAt = :expiresAt",
            ExpressionAttributeNames: { "#day": "day" },
            ExpressionAttributeValues: {
              ":userId": record.userId,
              ":day": day,
              ":zero": 0,
              ":one": 1,
              ":limit": dailyLimit,
              ":updatedAt": record.createdAt,
              ":expiresAt": usageExpiresAt,
            },
          },
        },
        {
          Put: {
            TableName: config.tableName(),
            Item: record,
            ConditionExpression: "attribute_not_exists(pk) and attribute_not_exists(sk)",
          },
        },
      ],
    }));
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") return false;
    throw error;
  }
}

export async function getDailyScanUsage(userId: string, day: string) {
  const result = await dynamodb.send(new GetCommand({
    TableName: config.tableName(),
    Key: { pk: userPk(userId), sk: dailyUsageSk(day) },
  }));
  return ((result.Item as DailyUsageRecord | undefined)?.used) ?? 0;
}

export async function getScan(userId: string, scanId: string) {
  const result = await dynamodb.send(new GetCommand({
    TableName: config.tableName(),
    Key: { pk: userPk(userId), sk: scanSk(scanId) },
  }));
  return (result.Item as ScanRecord | undefined) ?? null;
}

export async function getScanById(scanId: string) {
  const result = await dynamodb.send(new QueryCommand({
    TableName: config.tableName(),
    IndexName: "scan-id-index",
    KeyConditionExpression: "gsi2pk = :pk",
    ExpressionAttributeValues: { ":pk": scanGsiPk(scanId) },
    Limit: 1,
  }));
  return (result.Items?.[0] as ScanRecord | undefined) ?? null;
}

export async function listScans(userId: string, limit: number, cursor?: Cursor) {
  const result = await dynamodb.send(new QueryCommand({
    TableName: config.tableName(),
    IndexName: "user-created-index",
    KeyConditionExpression: "gsi1pk = :pk",
    ExpressionAttributeValues: { ":pk": userPk(userId) },
    ScanIndexForward: false,
    Limit: limit,
    ExclusiveStartKey: cursor,
  }));
  return {
    items: (result.Items ?? []) as ScanRecord[],
    nextCursor: result.LastEvaluatedKey as Cursor | undefined,
  };
}

export async function countDailyLimitedScans(userId: string, dayStartIso: string) {
  const result = await dynamodb.send(new QueryCommand({
    TableName: config.tableName(),
    IndexName: "user-created-index",
    KeyConditionExpression: "gsi1pk = :pk and gsi1sk >= :start",
    FilterExpression: "countsAgainstLimit = :true",
    ExpressionAttributeValues: {
      ":pk": userPk(userId),
      ":start": createdSk(dayStartIso, ""),
      ":true": true,
    },
    Select: "COUNT",
  }));
  return result.Count ?? 0;
}

export async function claimScanForProcessing(record: ScanRecord) {
  try {
    const result = await dynamodb.send(new UpdateCommand({
      TableName: config.tableName(),
      Key: { pk: record.pk, sk: record.sk },
      ConditionExpression: "#status = :pending",
      UpdateExpression: "set #status = :processing, updatedAt = :updatedAt remove expiresAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":pending": "upload_pending",
        ":processing": "processing",
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }));
    return (result.Attributes as ScanRecord | undefined) ?? null;
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") return null;
    throw error;
  }
}

export async function completeScan(record: ScanRecord, resultReceipt: ScanRecord["result"]) {
  const now = new Date().toISOString();
  await dynamodb.send(new UpdateCommand({
    TableName: config.tableName(),
    Key: { pk: record.pk, sk: record.sk },
    UpdateExpression: "set #status = :status, updatedAt = :updatedAt, #result = :result, resultSummary = :summary, countsAgainstLimit = :true remove failureCode, failureMessage",
    ExpressionAttributeNames: { "#status": "status", "#result": "result" },
    ExpressionAttributeValues: {
      ":status": "completed",
      ":updatedAt": now,
      ":result": resultReceipt,
      ":summary": {
        store: resultReceipt?.store,
        date: resultReceipt?.date,
        total: resultReceipt?.total,
        itemCount: resultReceipt?.items.length ?? 0,
      },
      ":true": true,
    },
  }));
}

export async function failScan(record: ScanRecord, failureCode: string, failureMessage: string, countsAgainstLimit: boolean) {
  await dynamodb.send(new UpdateCommand({
    TableName: config.tableName(),
    Key: { pk: record.pk, sk: record.sk },
    UpdateExpression: "set #status = :status, updatedAt = :updatedAt, failureCode = :code, failureMessage = :message, countsAgainstLimit = :counts",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "failed",
      ":updatedAt": new Date().toISOString(),
      ":code": failureCode,
      ":message": failureMessage,
      ":counts": countsAgainstLimit,
    },
  }));
}

export async function deleteScan(record: ScanRecord) {
  await dynamodb.send(new DeleteCommand({
    TableName: config.tableName(),
    Key: { pk: record.pk, sk: record.sk },
  }));
}
