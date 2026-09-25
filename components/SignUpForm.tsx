"use client";

import { useState, type FormEvent } from "react";
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("Passwords must match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signUp({ name, email, password, confirmPassword: confirm });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("We could not create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
      <AmazonLogo variant="dark" className="mb-6" />
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)] sm:p-8">
        <p className="morrow-eyebrow">Make it yours</p>
        <h1 className="mt-2 font-display text-3xl text-headline">Create your account</h1>
        <p className="mt-2 text-sm text-text-secondary">Save your details for a smoother next visit.</p>
        {error && <p className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger" role="alert">{error}</p>}
        <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
          <div><label className="morrow-label" htmlFor="name">Your name</label><input id="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required className="morrow-input mt-1" /></div>
          <div><label className="morrow-label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="morrow-input mt-1" /></div>
          <div><label className="morrow-label" htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="morrow-input mt-1" /><p className="mt-1 text-xs text-text-muted">Use at least 6 characters.</p></div>
          <div><label className="morrow-label" htmlFor="confirm">Confirm password</label><input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required className="morrow-input mt-1" /></div>
          <button type="submit" disabled={busy} className="morrow-button mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-text-secondary">Already have an account? <button type="button" onClick={() => router.replace(`/signin?next=${encodeURIComponent(next)}`)} className="morrow-link">Sign in</button></p>
      </div>
    </div>
  );
}
