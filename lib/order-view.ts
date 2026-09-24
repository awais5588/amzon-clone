import "server-only";
import { connectDB } from "@/lib/mongoose";
import { OrderModel } from "@/lib/models";
import { isValidObjectId } from "mongoose";

export interface OrderView {
  _id: unknown;
  orderKey: string;
  user: unknown;
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    product: unknown;
    variantSku: string;
    title: string;
    image: string;
    qty: number;
    unitPriceCents: number;
  }>;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
  shippingMethod: { name: string; etaDays: number };
  payment: { brand: string; last4: string };
  totals: { subtotalCents: number; shippingCents: number; taxCents: number; totalCents: number };
  isGift: boolean;
  deliveredAt?: Date;
  shippedAt?: Date;
}

export async function fetchOwnedOrder(orderId: string, userId: string): Promise<OrderView | null> {
  await connectDB();
  if (!isValidObjectId(orderId)) return null;
  const order = await OrderModel.findOne({ _id: orderId, user: userId })
    .lean()
    .exec();
  return order as unknown as OrderView | null;
}

export async function fetchOwnedOrders(userId: string): Promise<OrderView[]> {
  await connectDB();
  const orders = await OrderModel.find({ user: userId }).sort({ createdAt: -1 }).lean().exec();
  return orders as unknown as OrderView[];
}