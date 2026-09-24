"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/app/_actions/auth";
import { AmazonLogo } from "./AmazonLogo";

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("Passwords must match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await signUp({ name, email, password, confirmPassword: confirm });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-8">
      <AmazonLogo variant="dark" className="mb-4" />
      <div className="w-full max-w-[350px] bg-card border border-border rounded-lg p-5 shadow-sm">
        <h1 className="text-[26px] font-light text-headline">Create Account</h1>
        {error && (
          <div className="mt-3 rounded-sm border border-[#c40000] bg-[#fff5f5] px-3 py-2 text-[13px] text-headline">
            <span className="inline-block w-2 h-2 rounded-full bg-[#c40000] mr-2" />
            {error}
          </div>
        )}
        <form onSubmit={(e) => void onSubmit(e)} className="mt-3 space-y-3">
          <div>
            <label htmlFor="name" className="block text-[13px] font-bold text-headline">
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-[13px] font-bold text-headline">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[13px] font-bold text-headline">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)]"
            />
            <p className="mt-0.5 text-[11px] text-muted">Passwords must be at least 6 characters.</p>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-[13px] font-bold text-headline">
              Re-enter password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[8px] bg-cta hover:bg-[#e6c200] border border-cta-border text-headline text-[13px] font-medium py-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Creating account…" : "Create your Amazon account"}
          </button>
        </form>
        <p className="mt-3 text-[11px] leading-snug text-muted">
          By creating an account, you agree to Amazon&apos;s Conditions of Use and Privacy Notice.
        </p>
        <p className="mt-2 text-[11px] text-muted">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.replace(`/signin?next=${encodeURIComponent(next)}`)}
            className="text-link hover:text-link-hover hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}