import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    addresses: [
      {
        _id: { type: Schema.Types.ObjectId, auto: true },
        fullName: { type: String, required: true },
        line1: { type: String, required: true },
        line2: { type: String, default: "" },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        phone: { type: String, default: "" },
        isDefault: { type: Boolean, default: false },
      },
    ],
    paymentMethods: [
      {
        _id: { type: Schema.Types.ObjectId, auto: true },
        cardholderName: { type: String, required: true },
        brand: { type: String, required: true },
        last4: { type: String, required: true },
        expMonth: { type: Number, required: true },
        expYear: { type: Number, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<User>;

export const UserModel =
  (models.User as ReturnType<typeof model<typeof userSchema>>) ??
  model("User", userSchema);