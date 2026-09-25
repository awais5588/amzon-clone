import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="morrow-panel w-full max-w-md p-8 text-center sm:p-10">
        <p className="morrow-eyebrow">Nothing here</p>
        <h1 className="mt-3 font-display text-4xl text-headline">That page wandered off.</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">We couldn&apos;t find the page you were looking for, but there&apos;s plenty more to explore.</p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/" className="morrow-button">Go home</Link>
          <Link href="/search" className="morrow-button-secondary">Browse the catalog</Link>
        </div>
      </div>
    </div>
  );
}
