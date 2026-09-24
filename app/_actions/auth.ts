"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { CART_COOKIE, clearGuestCartCookie, mergeGuestCartIntoUser } from "@/lib/cart";

export type AuthResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length === 0) {
    return { ok: false, error: "Enter your password." };
  }

  await connectDB();
  const user = (await UserModel.findOne({ email })
    .lean()
    .exec()) as unknown as { _id: unknown; passwordHash: string } | null;
  if (!user) {
    return { ok: false, error: "We cannot find an account with that email address." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Your password is incorrect." };
  }

  const userId = String(user._id);
  await createSession(userId);
  await mergeAndClearGuestCart(userId);

  return { ok: true };
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";
  const confirmPassword = input.confirmPassword ?? "";

  if (name.length < 2) {
    return { ok: false, error: "Enter your name." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Passwords must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords must match." };
  }

  await connectDB();
  const existing = await UserModel.findOne({ email }).lean().exec();
  if (existing) {
    return { ok: false, error: "An account with that email already exists. Sign in instead." };
  }

  const user = await UserModel.create({
    name,
    email,
    passwordHash: await hashPassword(password),
  } as never);

  const userId = String(user._id);
  await createSession(userId);
  await mergeAndClearGuestCart(userId);

  return { ok: true };
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

async function mergeAndClearGuestCart(userId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  await mergeGuestCartIntoUser(`user:${userId}`, token);
  await clearGuestCartCookie();
}