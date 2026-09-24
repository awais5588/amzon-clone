"use server";

import { resolveCartUserId } from "@/lib/cart";
import {
  addToCartCore,
  deleteCartCore,
  getCartStateCore,
  moveToCartCore,
  removeSavedCore,
  saveForLaterCore,
  setCartGiftCore,
  setCartItemQtyCore,
  type CartState,
} from "@/lib/cart-core";

export async function getCartState(): Promise<CartState> {
  const userId = await resolveCartUserId();
  return getCartStateCore(userId);
}

export async function addToCart(input: {
  productId: string;
  variantSku: string;
  qty?: number;
}): Promise<CartState> {
  const userId = await resolveCartUserId();
  return addToCartCore({ ...input, userId });
}

export async function setCartItemQty(input: {
  productId: string;
  variantSku: string;
  qty: number;
}): Promise<CartState> {
  const userId = await resolveCartUserId();
  return setCartItemQtyCore({ ...input, userId });
}

export async function saveForLater(variantSku: string): Promise<CartState> {
  const userId = await resolveCartUserId();
  return saveForLaterCore({ userId, variantSku });
}

export async function removeSaved(variantSku: string): Promise<CartState> {
  const userId = await resolveCartUserId();
  return removeSavedCore({ userId, variantSku });
}

export async function moveToCart(variantSku: string): Promise<CartState> {
  const userId = await resolveCartUserId();
  return moveToCartCore({ userId, variantSku });
}

export async function setCartGift(isGift: boolean): Promise<CartState> {
  const userId = await resolveCartUserId();
  return setCartGiftCore({ userId, isGift });
}

export async function removeAll(): Promise<CartState> {
  const userId = await resolveCartUserId();
  await deleteCartCore(userId);
  return getCartStateCore(userId);
}