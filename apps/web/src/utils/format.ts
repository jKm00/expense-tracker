/**
 * Formats a number with spaces as thousand separators and 2 decimal places.
 *
 * @param value - The number to format (number or numeric string)
 * @param options.sign - If true, prefix with + or - (default: false)
 * @param options.decimals - Number of decimal places (default: 2)
 * @returns Formatted string, e.g. "100 000.00" or "+100 000.00"
 */
export function formatAmount(
  value: number | string,
  options?: { sign?: boolean; decimals?: number },
): string {
  const { sign = false, decimals = 2 } = options ?? {};
  const num = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(num)) return "0.00";

  const abs = Math.abs(num);
  const formatted = abs.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  if (sign) {
    const prefix = num >= 0 ? "+" : "-";
    return `${prefix}${formatted}`;
  }

  return num < 0 ? `-${formatted}` : formatted;
}

/**
 * Shorthand: format with no decimals and no sign.
 */
export function formatAmountNoDecimals(
  value: number | string,
  options?: { sign?: boolean },
): string {
  return formatAmount(value, { ...options, decimals: 0 });
}
