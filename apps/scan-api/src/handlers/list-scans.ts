import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { decodeCursor, encodeCursor } from "../cursor";
import { config } from "../config";
import { getRequiredHeader, handleError, json } from "../http";
import { toSummary } from "../model";
import { getDailyScanUsage, listScans } from "../repo";

function todayWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { day: start.toISOString(), resetsAt: end.toISOString() };
}

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const userId = getRequiredHeader(event.headers, "x-user-id");
    const rawLimit = Number(event.queryStringParameters?.limit ?? 20);
    const limit = Math.min(50, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20));
    const dailyLimit = config.dailyLimit();
    const day = todayWindow();
    const [result, dailyUsed] = await Promise.all([
      listScans(userId, limit, decodeCursor(event.queryStringParameters?.cursor)),
      getDailyScanUsage(userId, day.day),
    ]);
    return json(200, {
      items: result.items.map(toSummary),
      nextCursor: encodeCursor(result.nextCursor),
      usage: {
        used: dailyUsed,
        limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - dailyUsed),
        resetsAt: day.resetsAt,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
