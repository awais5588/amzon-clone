import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String, required: true },
    title: { type: String, required: true },
    image: { type: String, default: "" },
    qty: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderKey: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
      index: true,
    },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: {
      fullName: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      phone: { type: String, default: "" },
    },
    shippingMethod: {
      name: { type: String, required: true },
      etaDays: { type: Number, required: true },
    },
    payment: {
      brand: { type: String, required: true },
      last4: { type: String, required: true },
    },
    totals: {
      subtotalCents: { type: Number, required: true, min: 0 },
      shippingCents: { type: Number, required: true, min: 0 },
      taxCents: { type: Number, required: true, min: 0 },
      totalCents: { type: Number, required: true, min: 0 },
    },
    isGift: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    shippedAt: { type: Date },
  },
  { timestamps: true }
);

export type Order = InferSchemaType<typeof orderSchema>;
export type OrderDoc = HydratedDocument<Order>;

export const OrderModel =
  (models.Order as ReturnType<typeof model<typeof orderSchema>>) ??
  model("Order", orderSchema);