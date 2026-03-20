import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { productService } from "./product.service";
import z from "zod";

const FiltersSchema = z.object({
  excludeTaggedProducts: z.boolean().optional(),
});

const getAll = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(FiltersSchema)
  .handler(async ({ context, data }) => {
    return await productService.getAll(context.user.id, {
      excludeTaggedProducts: data.excludeTaggedProducts,
    });
  });

export const productController = {
  getAll,
};
