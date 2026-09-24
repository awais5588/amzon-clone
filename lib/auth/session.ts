import "server-only";
import { cookies, headers } from "next/headers";
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

async function cookieOpts(maxAge?: number): Promise<{
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge?: number;
}> {
  let secure = process.env.NODE_ENV === "production";
  try {
    const h = await headers();
    if (h.get("x-forwarded-proto") === "https") secure = true;
  } catch {
    // headers() is only available within a request scope.
  }
  return { httpOnly: true, sameSite: "lax", secure, path: "/", ...(maxAge !== undefined ? { maxAge } : {}) };
}

async function readCookieToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

function clearCookie(): Promise<void> {
  return cookies().then((store) => {
    return cookieOpts(0).then((opts) => {
      store.set(SESSION_COOKIE, "", opts);
    });
  });
}

export async function issueSessionToken(userId: string): Promise<string> {
  return createSessionRecord(userId);
}

export async function createSession(userId: string): Promise<void> {
  const token = await issueSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, await cookieOpts(SESSION_TTL_MS / 1000));
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
export async function requireUser(nextPath = "/account"): Promise<{
  _id: string;
  name: string;
  email: string;
}> {
  const user = await getSessionUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
  return user;
}