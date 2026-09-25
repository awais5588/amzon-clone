"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="morrow-panel w-full max-w-md p-8 text-center sm:p-10">
        <p className="morrow-eyebrow">A small detour</p>
        <h1 className="mt-3 font-display text-3xl text-headline">Something went wrong.</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">The page could not finish loading. Try again, or return to the catalog and start fresh.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={reset} className="morrow-button">Try again</button>
          <a href="/search" className="morrow-button-secondary">Browse catalog</a>
        </div>
      </div>
    </div>
  );
}
