import z from "zod";

export const numberInputValidator = z.string().regex(/^-?\d+(\.\d+)?$/, {
  message: "Input must be a number",
});
