"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/app/_actions/auth";
import { AmazonLogo } from "./AmazonLogo";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await signIn({ email, password });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-8">
      <AmazonLogo variant="dark" className="mb-4" />
      <div className="w-full max-w-[350px] bg-card border border-border rounded-lg p-5 shadow-sm">
        <h1 className="text-[26px] font-light text-headline">Sign in</h1>
        {error && (
          <div className="mt-3 rounded-sm border border-[#c40000] bg-[#fff5f5] px-3 py-2 text-[13px] text-headline">
            <span className="inline-block w-2 h-2 rounded-full bg-[#c40000] mr-2" />
            {error}
          </div>
        )}
        <form onSubmit={(e) => void onSubmit(e)} className="mt-3">
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

          <div className="mt-3 flex items-center justify-between">
            <label htmlFor="password" className="text-[13px] font-bold text-headline">
              Password
            </label>
            <span className="text-[13px] text-link hover:text-link-hover hover:underline cursor-pointer">
              Forgot password?
            </span>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full h-8 rounded-sm border border-border px-2 text-sm outline-none focus:border-[#e77600] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.5)]"
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-[6px] bg-cta hover:bg-[#e6c200] border border-cta-border text-headline text-[13px] font-medium py-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-3 text-[11px] leading-snug text-muted">
          By continuing, you agree to Amazon&apos;s Conditions of Use and Privacy Notice.
        </p>
      </div>

      <div className="w-full max-w-[350px] mt-4">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className="h-px flex-1 bg-border" />
          New to Amazon?
          <span className="h-px flex-1 bg-border" />
        </div>
        <button
          type="button"
          onClick={() => router.push(`/signup?next=${encodeURIComponent(next)}`)}
          className="mt-3 w-full rounded-[6px] bg-[#f0f2f2] hover:bg-[#e3e6e6] border border-border text-[13px] py-1.5 cursor-pointer"
        >
          Create your Amazon account
        </button>
      </div>
    </div>
  );
}