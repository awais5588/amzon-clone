"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/_actions/auth";

export function AccountMenu({ user }: { user: { name: string } | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <Link href="/signin" className="flex items-center rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover">
        <span>
          <span className="block text-[11px] text-text-secondary">Welcome</span>
          <span className="block text-sm font-bold text-headline">Sign in</span>
        </span>
      </Link>
    );
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
      >
        <span>
          <span className="block max-w-24 truncate text-[11px] text-text-secondary">Hello, {user.name}</span>
          <span className="block text-sm font-bold text-headline">Account</span>
        </span>
        <svg viewBox="0 0 12 12" className="ml-1.5 h-3 w-3 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="m2.5 4.5 3.5 3 3.5-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface-raised p-2 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
          <div className="border-b border-border px-3 py-2.5">
            <p className="morrow-eyebrow">Your account</p>
            <p className="mt-1 truncate text-sm font-bold text-headline">{user.name}</p>
          </div>
          <div className="grid gap-1 p-1 pt-2 text-sm">
            <Link href="/account" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-headline">
              Account overview
            </Link>
            <Link href="/orders" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-headline">
              Your orders
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSignOut()}
              className="rounded-lg px-3 py-2.5 text-left text-text-secondary transition-colors hover:bg-surface-hover hover:text-headline disabled:opacity-50"
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
