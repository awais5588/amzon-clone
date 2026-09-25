import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { AmazonLogo } from "./AmazonLogo";
import { CartBadge } from "./CartBadge";
import { AccountMenu } from "./AccountMenu";

const CATEGORIES = ["Electronics", "Home & Kitchen", "Books", "Fashion", "Toys & Games"];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.2 4.2" strokeLinecap="round" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M5.5 8.5h13l1 11h-15l1-11Z" strokeLinejoin="round" />
      <path d="M9 9V6.8a3 3 0 0 1 6 0V9" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function GlobalNav({ user }: { user: { name: string } | null }) {
  return (
    <header id="top" className="sticky top-0 z-50 border-b border-border/80 bg-surface/95 backdrop-blur-xl">
      <div className="morrow-container">
        <div className="flex h-[4.5rem] items-center gap-3">
          <details className="group relative lg:hidden">
            <summary className="flex h-10 w-10 list-none items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-accent hover:text-accent [&::-webkit-details-marker]:hidden" aria-label="Open navigation">
              <MenuIcon />
            </summary>
            <div className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-border bg-surface-raised p-3 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
              <p className="morrow-eyebrow mb-3 px-2">Explore Morrow</p>
              <nav className="grid gap-1" aria-label="Mobile navigation">
                <Link href="/search" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-headline transition-colors hover:bg-surface-hover hover:text-accent">
                  Browse all products
                </Link>
                {CATEGORIES.map((category) => (
                  <Link
                    key={category}
                    href={`/search?department=${encodeURIComponent(category)}`}
                    className="rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-headline"
                  >
                    {category}
                  </Link>
                ))}
                <div className="my-2 border-t border-border" />
                <Link href="/orders" className="rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-headline">
                  Orders
                </Link>
                <div className="lg:hidden">
                  <AccountMenu user={user} />
                </div>
              </nav>
            </div>
          </details>

          <AmazonLogo className="shrink-0" />

          <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary navigation">
            <Link href="/search" className="text-sm font-semibold text-text-secondary transition-colors hover:text-accent">
              Explore
            </Link>
            <Link href="/search?sort=newest" className="text-sm font-semibold text-text-secondary transition-colors hover:text-accent">
              New arrivals
            </Link>
          </nav>

          <form action="/search" className="ml-auto hidden min-w-0 flex-1 items-center rounded-xl border border-border-strong bg-surface p-1 transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10 md:flex lg:max-w-[38rem]">
            <label htmlFor="global-search" className="sr-only">
              Search {BRAND.name}
            </label>
            <input
              id="global-search"
              type="search"
              name="q"
              placeholder={`Search ${BRAND.name}`}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-headline outline-none placeholder:text-text-muted"
            />
            <button type="submit" className="flex h-9 w-10 items-center justify-center rounded-lg bg-accent text-accent-ink transition-colors hover:bg-accent-hover" aria-label="Search">
              <SearchIcon />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <div className="hidden lg:block">
              <AccountMenu user={user} />
            </div>
            <Link href="/orders" className="hidden h-10 items-center rounded-lg px-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-headline lg:flex">
              Orders
            </Link>
            <Link href="/cart" className="relative flex h-10 items-center gap-2 rounded-lg border border-transparent px-2.5 text-sm font-bold text-headline transition-colors hover:border-border hover:bg-surface-hover">
              <BagIcon />
              <span className="hidden sm:inline">Bag</span>
              <CartBadge />
            </Link>
          </div>
        </div>

        <form action="/search" className="mb-3 flex items-center rounded-xl border border-border-strong bg-surface p-1 md:hidden">
          <label htmlFor="mobile-search" className="sr-only">
            Search {BRAND.name}
          </label>
          <input
            id="mobile-search"
            type="search"
            name="q"
            placeholder={`Search ${BRAND.name}`}
            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-headline outline-none placeholder:text-text-muted"
          />
          <button type="submit" className="flex h-9 w-10 items-center justify-center rounded-lg bg-accent text-accent-ink" aria-label="Search">
            <SearchIcon />
          </button>
        </form>
      </div>
    </header>
  );
}
