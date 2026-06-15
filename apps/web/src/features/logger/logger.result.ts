import { err as resultErr } from "@/utils/result";
import { getLogger } from "./logger.context";

export function err<const R extends string, E extends { reason: R }>(error: E) {
  getLogger().addAttrs({
    appError: true,
    errorReason: error.reason,
  });

  return resultErr(error);
}
