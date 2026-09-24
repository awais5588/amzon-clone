import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-card rounded-sm shadow-sm border border-border p-8 text-center max-w-md w-full">
        <h1 className="text-3xl font-semibold text-headline">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          We looked everywhere but couldn&apos;t find this page. It may have been moved or never
          existed.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/"
            className="bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-[8px] px-4 py-2 text-sm font-medium shadow-sm"
          >
            Go to homepage
          </Link>
          <Link
            href="/search"
            className="bg-white hover:bg-row-hover border border-border text-headline rounded-[8px] px-4 py-2 text-sm font-medium"
          >
            Search on Amazon
          </Link>
        </div>
      </div>
    </div>
  );
}