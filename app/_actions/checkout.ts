"use server";

import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import { getSessionUserId } from "@/lib/auth/session";
import { placeOrderCore, validateAddress } from "@/lib/order-placer";
import type { AddressInput, PaymentInput } from "@/lib/order-placer";

export type SavedAddressInput = AddressInput;

export interface SavedAddressView {
  id: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface SavedPaymentView {
  id: string;
  cardholderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface SavedPaymentInput {
  cardholderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

type UserRow = {
  addresses?: Array<{ _id: unknown; fullName: string; line1: string; line2: string; city: string; state: string; zip: string; phone: string }>;
  paymentMethods?: Array<{ _id: unknown; cardholderName: string; brand: string; last4: string; expMonth: number; expYear: number }>;
};

async function currentUserId(): Promise<string | null> {
  return getSessionUserId();
}

export async function saveShippingAddress(input: SavedAddressInput): Promise<
  | { ok: true; addresses: SavedAddressView[] }
  | { ok: false; error: string }
> {
  const userId = await currentUserId();
  if (!userId) redirect("/signin?next=/checkout");

  const err = validateAddress(input);
  if (err) return { ok: false, error: err };

  await connectDB();
  const user = (await UserModel.findById(userId).lean().exec()) as unknown as UserRow | null;
  const isFirst = !user || !user.addresses || user.addresses.length === 0;

  const updated = (await UserModel.findOneAndUpdate(
    { _id: userId },
    {
      $push: {
        addresses: {
          fullName: input.fullName.trim(),
          line1: input.line1.trim(),
          line2: (input.line2 ?? "").trim(),
          city: input.city.trim(),
          state: input.state.trim(),
          zip: input.zip.trim(),
          phone: (input.phone ?? "").trim(),
          isDefault: isFirst,
        },
      },
    },
    { new: true }
  )
    .lean()
    .exec()) as unknown as (UserRow & { addresses: Array<{ _id: unknown } & SavedAddressInput> }) | null;

  if (!updated) return { ok: false, error: "Could not save your address." };
  return {
    ok: true,
    addresses: updated.addresses.map((a) => ({
      id: String(a._id),
      fullName: a.fullName,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state,
      zip: a.zip,
      phone: a.phone,
    })),
  };
}

export async function savePaymentMethod(input: SavedPaymentInput): Promise<
  | { ok: true; paymentMethods: SavedPaymentView[] }
  | { ok: false; error: string }
> {
  const userId = await currentUserId();
  if (!userId) redirect("/signin?next=/checkout");

  const brand = (input.brand ?? "").trim();
  const last4 = (input.last4 ?? "").trim();
  const cardholderName = (input.cardholderName ?? "").trim();
  const expMonth = Number(input.expMonth);
  const expYear = Number(input.expYear);

  if (cardholderName.length < 2) return { ok: false, error: "Enter the cardholder's name." };
  if (brand.length < 1 || brand.length > 40) return { ok: false, error: "Invalid card brand." };
  if (!/^\d{4}$/.test(last4)) return { ok: false, error: "Invalid card number." };
  if (!(expMonth >= 1 && expMonth <= 12)) return { ok: false, error: "Invalid card expiration month." };
  if (!(expYear >= 2024 && expYear <= 2099)) return { ok: false, error: "Invalid card expiration year." };

  await connectDB();
  const user = (await UserModel.findById(userId).lean().exec()) as unknown as UserRow | null;
  const isFirst = !user || !user.paymentMethods || user.paymentMethods.length === 0;

  const updated = (await UserModel.findOneAndUpdate(
    { _id: userId },
    {
      $push: {
        paymentMethods: {
          cardholderName,
          brand,
          last4,
          expMonth,
          expYear,
          isDefault: isFirst,
        },
      },
    },
    { new: true }
  )
    .lean()
    .exec()) as unknown as (UserRow & { paymentMethods: Array<{ _id: unknown } & SavedPaymentInput> }) | null;

  if (!updated) return { ok: false, error: "Could not save your payment method." };
  return {
    ok: true,
    paymentMethods: updated.paymentMethods.map((m) => ({
      id: String(m._id),
      cardholderName: m.cardholderName,
      brand: m.brand,
      last4: m.last4,
      expMonth: m.expMonth,
      expYear: m.expYear,
    })),
  };
}

export type PlaceOrderRpcResult =
  | { ok: true; orderId: string; orderNumber: string }
  | {
      ok: false;
      code: "SIGN_IN" | "VALIDATION" | "CART_EMPTY" | "TOTAL_MISMATCH" | "OUT_OF_STOCK";
      error: string;
    };

export async function placeOrder(input: {
  orderKey: string;
  expectedTotalCents: number;
  address: AddressInput;
  payment: PaymentInput;
  isGift?: boolean;
  onlySkus?: string[];
}): Promise<PlaceOrderRpcResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, code: "SIGN_IN", error: "Please sign in to place your order." };

  const result = await placeOrderCore({
    userId,
    orderKey: input.orderKey,
    expectedTotalCents: input.expectedTotalCents,
    address: input.address,
    payment: input.payment,
    isGift: input.isGift,
    onlySkus: input.onlySkus && input.onlySkus.length > 0 ? input.onlySkus : undefined,
  });
  if (result.ok) return { ok: true, orderId: result.orderId, orderNumber: result.orderNumber };
  return { ok: false, code: result.code, error: result.error };
}