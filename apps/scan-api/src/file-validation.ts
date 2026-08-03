import type { ContentType } from "./model";

export function isValidMagicBytes(contentType: ContentType, bytes: Uint8Array) {
  switch (contentType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );
    case "application/pdf":
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
}

export function scanIdFromObjectKey(key: string) {
  const match = /^scans\/([^/]+)\/original\.(jpg|png|pdf)$/.exec(key);
  return match?.[1] ?? null;
}
