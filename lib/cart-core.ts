import { connectDB } from "@/lib/mongoose";
import { CartModel, ProductModel, type Product, type Variant } from "@/lib/models";

export interface CartLine {
  productId: string;
  variantSku: string;
  title: string;
  image: string;
  priceCents: number;
  qty: number;
}

export interface CartState {
  items: CartLine[];
  saved: CartLine[];
  isGift: boolean;
  totalQty: number;
  subtotalCents: number;
  qualifiesForFreeDelivery: boolean;
}

export const EMPTY_CART: CartState = {
  items: [],
  saved: [],
  isGift: false,
  totalQty: 0,
  subtotalCents: 0,
  qualifiesForFreeDelivery: false,
};

export class CartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartError";
  }
}

interface RawCartItemRow {
  product: unknown;
  variantSku: string;
  title: string;
  image: string;
  priceCents: number;
  qty: number;
}

export interface RawCart {
  userId: string;
  items: RawCartItemRow[];
  saved: RawCartItemRow[];
  isGift: boolean;
  save(): Promise<unknown>;
}

export type CartItem = CartLine;

type ProductRow = Product & { _id: unknown };

async function readProduct(id: string): Promise<ProductRow | null> {
  await connectDB();
  return (await ProductModel.findById(id).lean().exec()) as unknown as ProductRow | null;
}

function rowToLine(r: RawCartItemRow): CartLine {
  return {
    productId: String(r.product),
    variantSku: r.variantSku,
    title: r.title,
    image: r.image,
    priceCents: r.priceCents,
    qty: r.qty,
  };
}

function stateOf(items: RawCartItemRow[], saved: RawCartItemRow[], isGift: boolean): CartState {
  const itemsView = items.map(rowToLine);
  const savedView = saved.map(rowToLine);
  const totalQty = itemsView.reduce((s, i) => s + i.qty, 0);
  const subtotalCents = itemsView.reduce((s, i) => s + i.qty * i.priceCents, 0);
  return {
    items: itemsView,
    saved: savedView,
    isGift,
    totalQty,
    subtotalCents,
    qualifiesForFreeDelivery: subtotalCents > 0,
  };
}

async function findCartRaw(userId: string): Promise<RawCart | null> {
  await connectDB();
  return (await CartModel.findOne({ userId })) as unknown as RawCart | null;
}

async function getOrCreateCart(userId: string): Promise<RawCart> {
  const existing = await findCartRaw(userId);
  if (existing) return existing;
  await CartModel.create({ userId, items: [], saved: [], isGift: false } as never);
  const created = await findCartRaw(userId);
  if (!created) throw new CartError("Could not create cart");
  return created;
}

export async function getCartStateCore(userId: string): Promise<CartState> {
  const cart = await findCartRaw(userId);
  if (!cart) return EMPTY_CART;
  return stateOf(cart.items, cart.saved, !!cart.isGift);
}

export async function addToCartCore({
  userId,
  productId,
  variantSku,
  qty,
}: {
  userId: string;
  productId: string;
  variantSku: string;
  qty?: number;
}): Promise<CartState> {
  const amount = Math.max(1, qty ?? 1);
  const product = await readProduct(productId);
  if (!product) throw new CartError("Product not found");
  const variant = product.variants.find((v: Variant) => v.sku === variantSku);
  if (!variant) throw new CartError("Variant not found");

  const outOfStock = variant.stock <= 0;
  const cart = await getOrCreateCart(userId);
  const idx = cart.items.findIndex((i) => i.variantSku === variantSku);

  if (outOfStock) {
    if (idx === -1) throw new CartError("Currently unavailable.");
    await cart.save();
    return stateOf(cart.items, cart.saved, !!cart.isGift);
  }

  const cap = Math.max(1, variant.stock);
  if (idx === -1) {
    cart.items.push({
      product: String(product._id),
      variantSku: variant.sku,
      title: product.title,
      image: variant.images?.[0] ?? product.images?.[0] ?? "",
      priceCents: variant.priceCents,
      qty: Math.min(amount, cap),
    });
  } else {
    cart.items[idx].priceCents = variant.priceCents;
    cart.items[idx].qty = Math.min(cart.items[idx].qty + amount, cap);
  }
  await cart.save();
  return stateOf(cart.items, cart.saved, !!cart.isGift);
}

export async function setCartItemQtyCore({
  userId,
  productId,
  variantSku,
  qty,
}: {
  userId: string;
  productId: string;
  variantSku: string;
  qty: number;
}): Promise<CartState> {
  const amount = Math.max(0, qty);
  const cart = await getOrCreateCart(userId);
  const idx = cart.items.findIndex((i) => i.variantSku === variantSku);
  if (idx === -1) return stateOf(cart.items, cart.saved, !!cart.isGift);

  if (amount === 0) {
    cart.items.splice(idx, 1);
  } else {
    const product = await readProduct(productId);
    const variant = product?.variants.find((v: Variant) => v.sku === variantSku);
    const cap = variant && variant.stock > 0 ? variant.stock : amount;
    cart.items[idx].qty = Math.min(amount, cap);
  }
  await cart.save();
  return stateOf(cart.items, cart.saved, !!cart.isGift);
}

export async function saveForLaterCore({
  userId,
  variantSku,
}: {
  userId: string;
  variantSku: string;
}): Promise<CartState> {
  const cart = await getOrCreateCart(userId);
  const idx = cart.items.findIndex((i) => i.variantSku === variantSku);
  if (idx !== -1 && !cart.saved.some((s) => s.variantSku === variantSku)) {
    const [rowDoc] = cart.items.splice(idx, 1);
    cart.saved.push({
      product: rowDoc.product,
      variantSku: rowDoc.variantSku,
      title: rowDoc.title,
      image: rowDoc.image,
      priceCents: rowDoc.priceCents,
      qty: rowDoc.qty,
    });
  }
  await cart.save();
  return stateOf(cart.items, cart.saved, !!cart.isGift);
}

export async function removeSavedCore({
  userId,
  variantSku,
}: {
  userId: string;
  variantSku: string;
}): Promise<CartState> {
  const cart = await getOrCreateCart(userId);
  const idx = cart.saved.findIndex((i) => i.variantSku === variantSku);
  if (idx !== -1) cart.saved.splice(idx, 1);
  await cart.save();
  return stateOf(cart.items, cart.saved, !!cart.isGift);
}

export async function moveToCartCore({
  userId,
  variantSku,
}: {
  userId: string;
  variantSku: string;
}): Promise<CartState> {
  const cart = await getOrCreateCart(userId);
  const sIdx = cart.saved.findIndex((i) => i.variantSku === variantSku);
  if (sIdx === -1) return stateOf(cart.items, cart.saved, !!cart.isGift);

  const [rowDoc] = cart.saved.splice(sIdx, 1);
  const row = {
    product: rowDoc.product,
    variantSku: rowDoc.variantSku,
    title: rowDoc.title,
    image: rowDoc.image,
    priceCents: rowDoc.priceCents,
    qty: rowDoc.qty,
  };
  const product = await readProduct(String(row.product));
  const variant = product?.variants.find((v: Variant) => v.sku === variantSku);
  if (!variant || variant.stock <= 0) {
    await cart.save();
    return stateOf(cart.items, cart.saved, !!cart.isGift);
  }

  const cap = Math.max(1, variant.stock);
  const iIdx = cart.items.findIndex((i) => i.variantSku === variantSku);
  if (iIdx !== -1) {
    cart.items[iIdx].qty = Math.min(cart.items[iIdx].qty + row.qty, cap);
  } else {
    cart.items.push({ ...row, qty: Math.min(row.qty, cap) });
  }
  await cart.save();
  return stateOf(cart.items, cart.saved, !!cart.isGift);
}

export async function setCartGiftCore({
  userId,
  isGift,
}: {
  userId: string;
  isGift: boolean;
}): Promise<CartState> {
  const cart = await getOrCreateCart(userId);
  cart.isGift = !!isGift;
  await cart.save();
  return stateOf(cart.items, cart.saved, cart.isGift);
}

export async function deleteCartCore(userId: string): Promise<void> {
  await connectDB();
  await CartModel.deleteOne({ userId });
}

export async function findRawCart(userId: string): Promise<RawCart | null> {
  return findCartRaw(userId);
}