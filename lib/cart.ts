import "server-only";
import { cookies, headers } from "next/headers";
import {
  deleteCartCore,
  getCartStateCore,
  type CartState,
} from "@/lib/cart-core";

export const CART_COOKIE = "amz_cart_id";
export type { CartItem, CartState } from "@/lib/cart-core";

const EMPTY: CartState = {
  totalQty: 0,
  subtotalCents: 0,
  qualifiesForFreeDelivery: false,
  items: [],
  saved: [],
  isGift: false,
};

async function cookieOpts(extra: { maxAge?: number } = {}): Promise<{
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge?: number;
}> {
  let secure = process.env.NODE_ENV === "production";
  try {
    const h = await headers();
    if (h.get("x-forwarded-proto") === "https") secure = true;
  } catch {
    // headers() is only available within a request scope.
  }
  return { httpOnly: true, sameSite: "lax", secure, path: "/", ...extra };
}

export async function readGuestCartId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value;
}

/** Resolves the effective cart user id: authenticated users get "user:<id>", guests get a token cookie. */
export async function resolveCartUserId(): Promise<string> {
  const { getSessionUserId } = await import("@/lib/auth/session");
  const userId = await getSessionUserId();
  if (userId) return `user:${userId}`;

  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) {
    const fresh = crypto.randomUUID();
    store.set(CART_COOKIE, fresh, await cookieOpts({ maxAge: 60 * 60 * 24 * 30 }));
    return `guest:${fresh}`;
  }
  return `guest:${token}`;
}

export async function clearGuestCartCookie(): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, "", await cookieOpts({ maxAge: 0 }));
}

/** Best-effort guest cart state for the current request: authenticated users see their user cart. */
export async function getCartState(): Promise<CartState> {
  const { getSessionUserId } = await import("@/lib/auth/session");
  const userId = await getSessionUserId();
  if (userId) return getCartStateByUserId(`user:${userId}`);
  const token = await readGuestCartId();
  if (!token) return EMPTY;
  return getCartStateByUserId(`guest:${token}`);
}

export async function getCartStateByUserId(fullUserId: string): Promise<CartState> {
  const state = await getCartStateCore(fullUserId);
  if (state.items.length === 0 && state.saved.length === 0 && state.subtotalCents === 0) {
    return EMPTY;
  }
  return state;
}

export async function clearCartForUser(fullUserId: string): Promise<void> {
  await deleteCartCore(fullUserId);
}

export interface GuestCartMergeResult {
  merged: boolean;
  guestLineCount: number;
}

/**
 * Merges the current guest cart (from the cookie, or an explicit token) into an
 * authenticated user's cart, then removes the guest cart document.
 */
export async function mergeGuestCartIntoUser(
  fullUserId: string,
  guestToken?: string
): Promise<GuestCartMergeResult> {
  const { mergeGuestCartCore } = await import("@/lib/cart-merge");
  const token = guestToken ?? (await readGuestCartId());
  if (!token) return { merged: false, guestLineCount: 0 };
  return mergeGuestCartCore(fullUserId, token);
}