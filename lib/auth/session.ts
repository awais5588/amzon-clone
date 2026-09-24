import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import {
  SESSION_TTL_MS,
  createSessionRecord,
  deleteSessionRecord,
  findUserIdByToken,
} from "./session-core";

export const SESSION_COOKIE = "amz_sid";
const BASE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/" };

async function readCookieToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

function clearCookie(): Promise<void> {
  return cookies().then((store) => {
    store.set(SESSION_COOKIE, "", { ...BASE_OPTS, maxAge: 0 });
  });
}

export async function issueSessionToken(userId: string): Promise<string> {
  return createSessionRecord(userId);
}

export async function createSession(userId: string): Promise<void> {
  const token = await issueSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { ...BASE_OPTS, maxAge: SESSION_TTL_MS / 1000 });
}

export async function revokeSessionToken(token: string): Promise<void> {
  await deleteSessionRecord(token);
}

export const getSessionUserId = cache(async (): Promise<string | null> => {
  const token = await readCookieToken();
  if (!token) return null;
  const userId = await findUserIdByToken(token);
  if (!userId) {
    await clearCookie();
    return null;
  }
  return userId;
});

export async function getSessionUser(): Promise<{ _id: string; name: string; email: string } | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  await connectDB();
  const user = (await UserModel.findById(userId)
    .lean()
    .exec()) as unknown as { _id: unknown; name: string; email: string } | null;
  if (!user) return null;
  return { _id: String(user._id), name: user.name, email: user.email };
}

export async function destroySession(): Promise<void> {
  const token = await readCookieToken();
  await clearCookie();
  if (token) await revokeSessionToken(token);
}

/** Redirects to sign-in when no authenticated user exists; otherwise returns the user. */
export async function requireUser(): Promise<{ _id: string; name: string; email: string }> {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/account");
  return user;
}