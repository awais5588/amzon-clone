import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String, required: true },
    title: { type: String, required: true },
    image: { type: String, default: "" },
    priceCents: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

export type Cart = InferSchemaType<typeof cartSchema>;
export type CartDoc = HydratedDocument<Cart>;

export const CartModel =
  (models.Cart as ReturnType<typeof model<typeof cartSchema>>) ??
  model("Cart", cartSchema);