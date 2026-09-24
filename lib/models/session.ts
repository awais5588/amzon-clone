import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Session = InferSchemaType<typeof sessionSchema>;
export type SessionDoc = HydratedDocument<Session>;

export const SessionModel =
  (models.Session as ReturnType<typeof model<typeof sessionSchema>>) ??
  model("Session", sessionSchema);