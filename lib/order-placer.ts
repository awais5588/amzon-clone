import { connectDB } from "@/lib/mongoose";
import { CartModel, OrderModel, ProductModel } from "@/lib/models";
import type { Order } from "@/lib/models";
import { orderDisplayNumber } from "@/lib/format";

export interface AddressInput {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

export interface PaymentInput {
  brand: string;
  last4: string;
}

export interface PlaceOrderParams {
  userId: string;
  orderKey: string;
  expectedTotalCents: number;
  address: AddressInput;
  payment: PaymentInput;
  isGift?: boolean;
}

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; code: "VALIDATION" | "CART_EMPTY" | "TOTAL_MISMATCH" | "OUT_OF_STOCK"; error: string };

const ORDER_KEY_RE = /^[a-zA-Z0-9-]{8,64}$/;

type OrderRow = Order & { _id: unknown };

export function validateAddress(a: AddressInput): string | null {
  if (typeof a.fullName !== "string" || a.fullName.trim().length < 2 || a.fullName.trim().length > 80)
    return "Enter the recipient's full name.";
  if (typeof a.line1 !== "string" || a.line1.trim().length < 1 || a.line1.trim().length > 120)
    return "Enter your street address.";
  if (typeof a.line2 === "string" && a.line2.trim().length > 120) return "Address line 2 is too long.";
  if (typeof a.city !== "string" || a.city.trim().length < 1 || a.city.trim().length > 60)
    return "Enter your city.";
  if (typeof a.state !== "string" || a.state.trim().length < 1 || a.state.trim().length > 40)
    return "Select a state.";
  if (typeof a.zip !== "string" || !/^\d{5}(-\d{4})?$/.test(a.zip.trim()))
    return "Enter a valid ZIP code.";
  if (
    typeof a.phone === "string" &&
    a.phone.trim() !== "" &&
    !/^[\d\s()+-]{7,20}$/.test(a.phone.trim())
  )
    return "Enter a valid phone number.";
  return null;
}

export function validatePayment(p: PaymentInput): string | null {
  if (typeof p.brand !== "string" || p.brand.trim().length < 1 || p.brand.trim().length > 40)
    return "Select or add a payment method.";
  if (typeof p.last4 !== "string" || !/^\d{4}$/.test(p.last4.trim()))
    return "Select or add a payment method.";
  return null;
}

/**
 * Places an order for an authenticated user's cart. Idempotent per orderKey:
 * repeating (or racing) a submission with the same key never creates duplicates
 * and never decrements stock twice. Only mock payment metadata (brand/last4) is
 * ever stored; CVV and full card numbers are never accepted or persisted.
 */
export async function placeOrderCore(params: PlaceOrderParams): Promise<PlaceOrderResult> {
  await connectDB();

  if (!ORDER_KEY_RE.test(params.orderKey)) {
    return { ok: false, code: "VALIDATION", error: "Invalid order key." };
  }

  const addressError = validateAddress(params.address);
  if (addressError) return { ok: false, code: "VALIDATION", error: addressError };
  const paymentError = validatePayment(params.payment);
  if (paymentError) return { ok: false, code: "VALIDATION", error: paymentError };

  const existing = (await OrderModel.findOne({ orderKey: params.orderKey })
    .lean()
    .exec()) as unknown as OrderRow | null;
  if (existing) {
    if (String(existing.user) !== params.userId) {
      return { ok: false, code: "VALIDATION", error: "This order key is already in use." };
    }
    return { ok: true, orderId: String(existing._id), orderNumber: orderDisplayNumber(existing.orderKey) };
  }

  const cart = (await CartModel.findOne({ userId: `user:${params.userId}` })
    .lean()
    .exec()) as unknown as {
    items: Array<{
      product: unknown;
      variantSku: string;
      title: string;
      image: string;
      priceCents: number;
      qty: number;
    }>;
  } | null;

  const items = cart?.items ?? [];
  if (items.length === 0) {
    return { ok: false, code: "CART_EMPTY", error: "Your cart is empty. Add items before checking out." };
  }

  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
  const shippingCents = 0;
  const taxCents = 0;
  const totalCents = subtotalCents + shippingCents + taxCents;

  if (params.expectedTotalCents !== totalCents) {
    return {
      ok: false,
      code: "TOTAL_MISMATCH",
      error: "Prices in your cart changed. Please review your order and try again.",
    };
  }

  const products = (await ProductModel.find({ _id: { $in: items.map((i) => String(i.product)) } })
    .lean()
    .exec()) as unknown as Array<{ variants: Array<{ sku: string; stock: number }> }>;
  const stockBySku = new Map<string, number>();
  for (const p of products) {
    for (const v of p.variants) stockBySku.set(v.sku, v.stock);
  }
  for (const i of items) {
    if ((stockBySku.get(i.variantSku) ?? 0) < i.qty) {
      return {
        ok: false,
        code: "OUT_OF_STOCK",
        error: "An item in your cart is no longer available in the requested quantity.",
      };
    }
  }

  // Conditional per-line stock decrement; rolls back on any failure.
  const decremented: Array<{ sku: string; qty: number }> = [];
  try {
    for (const i of items) {
      const res = await ProductModel.updateOne(
        {
          _id: String(i.product),
          variants: { $elemMatch: { sku: i.variantSku, stock: { $gte: i.qty } } },
        },
        { $inc: { "variants.$.stock": -i.qty } }
      );
      if (res.modifiedCount !== 1) throw new Error(`stock-guard failed for ${i.variantSku}`);
      decremented.push({ sku: i.variantSku, qty: i.qty });
    }

    await OrderModel.create({
      orderKey: params.orderKey,
      user: params.userId,
      status: "Pending",
      items: items.map((i) => ({
        product: i.product,
        variantSku: i.variantSku,
        title: i.title,
        image: i.image,
        qty: i.qty,
        unitPriceCents: i.priceCents,
      })),
      shippingAddress: {
        fullName: params.address.fullName.trim(),
        line1: params.address.line1.trim(),
        line2: (params.address.line2 ?? "").trim(),
        city: params.address.city.trim(),
        state: params.address.state.trim(),
        zip: params.address.zip.trim(),
        phone: (params.address.phone ?? "").trim(),
      },
      shippingMethod: { name: "FREE delivery", etaDays: 4 },
      payment: { brand: params.payment.brand.trim(), last4: params.payment.last4.trim() },
      totals: { subtotalCents, shippingCents, taxCents, totalCents },
      isGift: Boolean(params.isGift),
    } as never);
  } catch (err) {
    for (const d of decremented) {
      await ProductModel.updateOne(
        { variants: { $elemMatch: { sku: d.sku } } },
        { $inc: { "variants.$.stock": d.qty } }
      );
    }
    const winner = (await OrderModel.findOne({ orderKey: params.orderKey })
      .lean()
      .exec()) as unknown as OrderRow | null;
    if (winner) {
      if (String(winner.user) !== params.userId) {
        return { ok: false, code: "VALIDATION", error: "This order key is already in use." };
      }
      return { ok: true, orderId: String(winner._id), orderNumber: orderDisplayNumber(winner.orderKey) };
    }
    void err;
    return { ok: false, code: "VALIDATION", error: "We could not place your order. Please try again." };
  }

  await CartModel.deleteOne({ userId: `user:${params.userId}` });
  const placed = (await OrderModel.findOne({ orderKey: params.orderKey })
    .lean()
    .exec()) as unknown as OrderRow | null;
  if (!placed) throw new Error("Order was created but could not be re-read");
  return { ok: true, orderId: String(placed._id), orderNumber: orderDisplayNumber(placed.orderKey) };
}