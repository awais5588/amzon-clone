import Link from "next/link";
import { BRAND } from "@/lib/brand";

const FOOTER_GROUPS = [
  {
    title: "Explore",
    links: [
      { label: "All products", href: "/search" },
      { label: "New arrivals", href: "/search?sort=newest" },
      { label: "Best sellers", href: "/search?sort=bestsellers" },
      { label: "Top rated", href: "/search?sort=rating" },
    ],
  },
  {
    title: "Categories",
    links: [
      { label: "Electronics", href: "/search?department=Electronics" },
      { label: "Home & Kitchen", href: "/search?department=Home%20%26%20Kitchen" },
      { label: "Books", href: "/search?department=Books" },
      { label: "Fashion", href: "/search?department=Fashion" },
    ],
  },
  {
    title: "Your Morrow",
    links: [
      { label: "Sign in", href: "/signin" },
      { label: "Create account", href: "/signup" },
      { label: "Your orders", href: "/orders" },
      { label: "Your bag", href: "/cart" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="morrow-container py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="font-display text-3xl leading-tight text-headline">Make room for good things.</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
              {BRAND.descriptor}. A quieter place to discover what comes next.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="morrow-eyebrow">{group.title}</h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-text-secondary transition-colors hover:text-accent">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <span>Database-backed storefront · Built for considered shopping</span>
        </div>
      </div>
    </footer>
  );
}
