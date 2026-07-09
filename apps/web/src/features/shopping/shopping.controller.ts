import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { shoppingService } from "./shopping.service";
import {
  addShoppingItemSchema,
  completeShoppingSchema,
  removeShoppingItemSchema,
  toggleShoppingItemSchema,
} from "./shopping.dtos";

const getShoppingList = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await shoppingService.getShoppingList(userId);
  });

const addShoppingItem = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(addShoppingItemSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await shoppingService.addShoppingItem(userId, data);
  });

const toggleShoppingItem = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(toggleShoppingItemSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await shoppingService.toggleShoppingItem(
      userId,
      data.shoppingItemId,
      data.checked,
    );
  });

const removeShoppingItem = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(removeShoppingItemSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await shoppingService.removeShoppingItem(userId, data.shoppingItemId);
  });

const clearCompletedShoppingItems = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await shoppingService.clearCompletedShoppingItems(userId);
  });

const clearShoppingList = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await shoppingService.clearShoppingList(userId);
  });

const completeShopping = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(completeShoppingSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await shoppingService.completeShopping(userId, data);
  });

export const shoppingController = {
  getShoppingList,
  addShoppingItem,
  toggleShoppingItem,
  removeShoppingItem,
  clearCompletedShoppingItems,
  clearShoppingList,
  completeShopping,
};
