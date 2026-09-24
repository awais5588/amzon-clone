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
      <Link
        href="/signin"
        className="flex items-center border border-transparent hover:border-white px-2 leading-tight"
      >
        <span>
          <span className="block text-xs text-[#cccccc]">Hello, sign in</span>
          <span className="block text-sm font-bold">Account & Lists ▾</span>
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
        className="flex items-center border border-transparent hover:border-white px-2 leading-tight cursor-pointer text-left"
      >
        <span>
          <span className="block text-xs text-[#cccccc]">Hello, {user.name}</span>
          <span className="block text-sm font-bold">Account & Lists ▾</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white text-headline rounded-b-md shadow-lg border border-border z-50">
          <div className="p-3 border-b border-border">
            <p className="text-[13px] text-muted leading-tight">Your account</p>
            <p className="text-sm font-semibold truncate">{user.name}</p>
          </div>
          <div className="p-2 grid grid-cols-2 gap-y-1 text-[13px]">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-row-hover rounded-sm"
            >
              Your Account
            </Link>
            <Link
              href="/account#orders"
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-row-hover rounded-sm"
            >
              Your Orders
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSignOut()}
              className="p-2 text-left hover:bg-row-hover rounded-sm disabled:opacity-50 cursor-pointer"
            >
              {busy ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}