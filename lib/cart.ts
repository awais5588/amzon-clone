import "server-only";
import { cookies } from "next/headers";

export const CART_COOKIE = "amz_cart_id";

export interface CartItem {
  productId: string;
  variantSku: string;
  title: string;
  image: string;
  priceCents: number;
  qty: number;
}

export interface CartState {
  totalQty: number;
  subtotalCents: number;
  qualifiesForFreeDelivery: boolean;
  items: CartItem[];
}

const EMPTY: CartState = {
  totalQty: 0,
  subtotalCents: 0,
  qualifiesForFreeDelivery: false,
  items: [],
};

export function cartItemView(item: {
  product: unknown;
  variantSku: string;
  title: string;
  image: string;
  priceCents: number;
  qty: number;
}): CartItem {
  return {
    productId: String(item.product),
    variantSku: item.variantSku,
    title: item.title,
    image: item.image,
    priceCents: item.priceCents,
    qty: item.qty,
  };
}

export function summarize(items: CartItem[]): CartState {
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const subtotalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  return {
    totalQty,
    subtotalCents,
    qualifiesForFreeDelivery: subtotalCents > 0,
    items,
  };
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
    store.set(CART_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return `guest:${fresh}`;
  }
  return `guest:${token}`;
}

export async function clearGuestCartCookie(): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export interface RawCartItem {
  product: unknown;
  variantSku: string;
  title: string;
  image: string;
  priceCents: number;
  qty: number;
}

export type RawCart = { userId: string; items: RawCartItem[]; save(): Promise<unknown> };

export async function findCartRaw(userId: string): Promise<RawCart | null> {
  const { connectDB } = await import("@/lib/mongoose");
  const { CartModel } = await import("@/lib/models");
  await connectDB();
  return (await CartModel.findOne({ userId })) as unknown as RawCart | null;
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
  const { connectDB } = await import("@/lib/mongoose");
  const { CartModel } = await import("@/lib/models");
  await connectDB();
  const cart = (await CartModel.findOne({ userId: fullUserId })
    .lean()
    .exec()) as unknown as { items: RawCartItem[] } | null;
  if (!cart) return EMPTY;
  return summarize(cart.items.map(cartItemView));
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