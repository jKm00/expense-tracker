import type { Cursor } from "./repo";

export function encodeCursor(cursor?: Cursor) {
  if (!cursor) return undefined;
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value?: string | null) {
  if (!value) return undefined;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Cursor;
  } catch {
    return undefined;
  }
}
