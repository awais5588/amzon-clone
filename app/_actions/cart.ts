"use server";

import { CartModel, ProductModel, type Product, type Variant } from "@/lib/models";
import { connectDB } from "@/lib/mongoose";
import {
  cartItemView,
  findCartRaw,
  readGuestCartId,
  resolveCartUserId,
  summarize,
  type CartItem,
  type CartState,
  type RawCartItem,
} from "@/lib/cart";

type ProductRow = Product & { _id: unknown };

const EMPTY: CartState = {
  totalQty: 0,
  subtotalCents: 0,
  qualifiesForFreeDelivery: false,
  items: [],
};

async function readProduct(id: string): Promise<ProductRow | null> {
  await connectDB();
  return (await ProductModel.findById(id).lean().exec()) as unknown as ProductRow | null;
}

export async function getCartState(): Promise<CartState> {
  await connectDB();
  const token = await readGuestCartId();
  if (!token) return EMPTY;
  const cart = (await CartModel.findOne({ userId: `guest:${token}` })
    .lean()
    .exec()) as unknown as { items: RawCartItem[] } | null;
  if (!cart) return EMPTY;
  return summarize(cart.items.map(cartItemView));
}

export async function addToCart(input: {
  productId: string;
  variantSku: string;
  qty?: number;
}): Promise<CartState> {
  const qty = Math.max(1, input.qty ?? 1);
  await connectDB();
  const userId = await resolveCartUserId();

  const product = await readProduct(input.productId);
  if (!product) throw new Error("Product not found");
  const variant = product.variants.find((v: Variant) => v.sku === input.variantSku);
  if (!variant) throw new Error("Variant not found");

  const snapshot: CartItem = {
    productId: String(product._id),
    variantSku: variant.sku,
    title: product.title,
    image: variant.images?.[0] ?? product.images?.[0] ?? "",
    priceCents: variant.priceCents,
    qty,
  };

  let cart = await findCartRaw(userId);
  if (!cart) {
    await CartModel.create({ userId, items: [] } as never);
    cart = await findCartRaw(userId);
    if (!cart) return summarize([]);
  }
  const idx = cart.items.findIndex((i) => i.variantSku === snapshot.variantSku);
  if (idx === -1) {
    cart.items.push({
      product: snapshot.productId,
      variantSku: snapshot.variantSku,
      title: snapshot.title,
      image: snapshot.image,
      priceCents: snapshot.priceCents,
      qty: snapshot.qty,
    });
  } else {
    const nextQty = Math.min(cart.items[idx].qty + qty, variant.stock || qty);
    cart.items[idx].qty = nextQty;
  }
  await cart.save();
  return summarize(cart.items.map(cartItemView));
}

export async function setCartItemQty(input: {
  productId: string;
  variantSku: string;
  qty: number;
}): Promise<CartState> {
  await connectDB();
  const userId = await resolveCartUserId();
  const qty = Math.max(0, input.qty);

  const cart = await findCartRaw(userId);
  if (!cart) return summarize([]);

  const idx = cart.items.findIndex((i) => i.variantSku === input.variantSku);
  if (idx === -1) return summarize(cart.items.map(cartItemView));

  if (qty === 0) {
    cart.items.splice(idx, 1);
  } else {
    const product = await readProduct(input.productId);
    const variant = product?.variants.find((v: Variant) => v.sku === input.variantSku);
    cart.items[idx].qty = Math.min(qty, variant?.stock || qty);
  }
  await cart.save();
  return summarize(cart.items.map(cartItemView));
}

export async function removeAll(): Promise<CartState> {
  await connectDB();
  const userId = await resolveCartUserId();
  await (CartModel.deleteOne({ userId }) as unknown as Promise<unknown>);
  return summarize([]);
}