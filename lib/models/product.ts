import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

const variantSchema = new Schema(
  {
    label: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    priceCents: { type: Number, required: true, min: 0 },
    listPriceCents: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, default: 0 },
    images: { type: [String], default: [] },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    bullets: { type: [String], default: [] },
    categoryPath: { type: [String], required: true, index: true },
    images: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    boughtInPastMonth: { type: Number, default: 0, min: 0 },
    bestsellerRank: { type: String, default: "" },
    isAmazonBrand: { type: Boolean, default: false },
    variants: { type: [variantSchema], required: true },
    primeEligible: { type: Boolean, default: true },
    freeReturns: { type: Boolean, default: true },
    carbonImpact: { type: String, enum: ["Low", "Moderate", "High"], default: "Low" },
    seller: { type: String, default: "Amazon.com" },
  },
  { timestamps: true }
);

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDoc = HydratedDocument<Product>;
export type Variant = Product["variants"][number];

export const ProductModel =
  (models.Product as ReturnType<typeof model<typeof productSchema>>) ??
  model("Product", productSchema);