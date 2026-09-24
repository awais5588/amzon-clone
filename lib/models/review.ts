import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    verifiedPurchase: { type: Boolean, default: true },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, rating: -1 });
reviewSchema.index({ product: 1, createdAt: -1 });

export type Review = InferSchemaType<typeof reviewSchema>;
export type ReviewDoc = HydratedDocument<Review>;

export const ReviewModel =
  (models.Review as ReturnType<typeof model<typeof reviewSchema>>) ??
  model("Review", reviewSchema);