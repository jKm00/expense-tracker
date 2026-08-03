export const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024;
export const RECEIPT_SCAN_SERVICE_UNAVAILABLE_MESSAGE = "Receipt scanning is unavailable right now. The scan service did not respond, so your receipt was not uploaded. Try again after the service is back online.";
export const RECEIPT_SCAN_FILE_UPLOAD_FAILED_MESSAGE = "Receipt upload did not finish. Your scan was not started because the receipt file could not be sent. Check your connection and try again.";

export function validateReceiptFile(file: File) {
  const supportedType = ["image/jpeg", "image/png", "application/pdf"].includes(file.type);

  if (!supportedType) {
    return "Choose a JPEG, PNG, or PDF receipt file.";
  }

  if (file.size > MAX_RECEIPT_FILE_SIZE) {
    return "Receipt file is too large. Choose an image or PDF under 10 MB.";
  }

  return null;
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("INVALID_FILE_RESULT"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export function formatReceiptScanStartError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (!message || message === "fetch failed" || message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return RECEIPT_SCAN_SERVICE_UNAVAILABLE_MESSAGE;
  }

  return message;
}
