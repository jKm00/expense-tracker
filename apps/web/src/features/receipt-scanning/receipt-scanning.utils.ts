export const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024;

export function validateReceiptFile(file: File) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");

  if (!isImage && !isPdf) {
    return "Choose an image or PDF receipt file.";
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
