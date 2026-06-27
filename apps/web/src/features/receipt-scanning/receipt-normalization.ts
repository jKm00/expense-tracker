export function normalizeReceiptName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeReceiptName(value: string) {
  return normalizeReceiptName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function normalizeMoney(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed.toFixed(2);
}

export function normalizePositiveInteger(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return String(parsed);
}
