export function getErrorMessage(err: {
  reason: string;
  message?: string;
}): string {
  switch (err.reason) {
    case "TRANSACTION_NOT_FOUND":
    case "PRODUCT_NOT_FOUND":
    case "RECURRING_PRODUCT_NOT_FOUND":
      return "Item not found. It may have been deleted.";
    case "TRANSACTION_FORBIDDEN":
    case "PRODUCT_FORBIDDEN":
    case "RECURRING_PRODUCT_FORBIDDEN":
      return "You don't have access to this item.";
    default:
      return "Something went wrong. Please try again.";
  }
}
