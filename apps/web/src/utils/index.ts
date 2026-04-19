export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { formatAmount, formatAmountNoDecimals } from "./format";
