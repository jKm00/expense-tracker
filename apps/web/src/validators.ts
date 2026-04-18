import z from "zod";

export const numberValidator = z.string().regex(/^-?\d+(\.\d+)?$/, {
  message: "Must be a number",
});

export const positiveNumberValidator = z.string().regex(/^\d+(\.\d+)?$/, {
  message: "Must be a positive number",
});

export const positiveIntegerValidator = z.string().regex(/^[1-9]\d*$/, {
  message: "Must be a positive integer",
});
