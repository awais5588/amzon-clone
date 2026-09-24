"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-card rounded-sm shadow-sm border border-border p-8 text-center max-w-md w-full">
        <h1 className="text-2xl font-semibold text-headline">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          An unexpected error occurred. Try again — if it keeps happening, please come back later.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-[8px] px-5 py-2 text-sm font-medium shadow-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}