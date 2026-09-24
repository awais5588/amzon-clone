import { createHash, randomBytes } from "node:crypto";
import { connectDB } from "@/lib/mongoose";
import { SessionModel } from "@/lib/models";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function sha256Token(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSessionRecord(userId: string): Promise<string> {
  await connectDB();
  const token = randomBytes(32).toString("base64url");
  await SessionModel.create({
    tokenHash: sha256Token(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  } as never);
  return token;
}

export async function findUserIdByToken(token: string): Promise<string | null> {
  await connectDB();
  const rec = (await SessionModel.findOne({
    tokenHash: sha256Token(token),
    expiresAt: { $gt: new Date() },
  })
    .lean()
    .exec()) as unknown as { userId: unknown } | null;
  return rec ? String(rec.userId) : null;
}

export async function deleteSessionRecord(token: string): Promise<void> {
  await connectDB();
  await SessionModel.deleteOne({ tokenHash: sha256Token(token) });
}