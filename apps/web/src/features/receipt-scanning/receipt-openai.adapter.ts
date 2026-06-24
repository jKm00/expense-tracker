import { extractedReceiptSchema } from "./receipt-scanning.dtos";
import { ExtractedReceipt } from "./receipt-scanning.models";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_RECEIPT_MODEL || "gpt-4o-mini";

function buildPrompt() {
  return `Extract structured grocery receipt data from this receipt file.

Return only valid JSON matching this shape:
{
  "store": string optional,
  "date": ISO date/datetime string optional,
  "total": positive decimal string optional,
  "confidence": number 0-1,
  "warnings": string[],
  "items": [{
    "name": string,
    "quantity": positive integer string,
    "unitPrice": positive decimal string,
    "lineTotal": positive decimal string,
    "confidence": number 0-1
  }]
}

Rules:
- Return product-like purchased items only.
- Exclude subtotal, tax, payment, change, card, loyalty, and summary lines.
- Apply discounts to final product prices. Do not return discount rows.
- Include bottle deposits in the relevant product total when possible.
- For weighted or fractional-quantity items, return quantity "1", unitPrice as final line total, and lineTotal as final line total.
- For integer quantities greater than 1, return per-unit unitPrice and quantity as the integer count.
- Normalize all money with dot decimal separator and two decimals, e.g. "12.50".
- If a line is too uncertain or price cannot be normalized, omit it and add a warning.
- Do not invent items.`;
}

function parseJsonContent(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (!match) {
    throw new Error("OPENAI_RESPONSE_NOT_JSON");
  }

  return JSON.parse(match[1]);
}

function getResponseText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  if ("output_text" in payload && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (typeof contentItem !== "object" || contentItem === null) {
        continue;
      }

      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === "string") {
        return text;
      }
    }
  }

  return null;
}

function getFileInput(receiptDataUrl: string) {
  if (receiptDataUrl.startsWith("data:application/pdf")) {
    return {
      type: "input_file",
      filename: "receipt.pdf",
      file_data: receiptDataUrl,
    };
  }

  return {
    type: "input_image",
    image_url: receiptDataUrl,
    detail: "high",
  };
}

export async function extractReceiptWithOpenAI(
  receiptDataUrl: string,
): Promise<ExtractedReceipt> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildPrompt() },
            getFileInput(receiptDataUrl),
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OPENAI_HTTP_${response.status}`);
  }

  const payload = await response.json();
  const content = getResponseText(payload);
  if (!content) {
    throw new Error("OPENAI_RESPONSE_EMPTY");
  }

  const parsed = parseJsonContent(content);
  return extractedReceiptSchema.parse(parsed);
}
