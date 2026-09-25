import type { ReactNode } from "react";
import Link from "next/link";
import type { Product } from "@/lib/models";
import { connectDB } from "@/lib/mongoose";
import { ProductModel } from "@/lib/models";
import { SerpResultCard } from "@/components/SerpResultCard";
import { SearchSort } from "@/components/SearchSort";
import { MiniCart } from "@/components/MiniCart";
import { getCartState } from "@/lib/cart";
import { deliveryPromises } from "@/lib/format";

export const dynamic = "force-dynamic";

const deliveryPromisesPage = deliveryPromises();
const POPULAR_IDEAS = ["Fire", "Android", "Streaming", "Apple"];
const POPULAR_IDEAS_MORE = ["Gaming", "Roku 4K HD"];
const NARROW_TOKENS = ["Gaming", "Remote cover", "Ethernet adapter", "Hdmi cable", "Roku 4K HD"];
const DELIVERY_OPTIONS = ["Today by 8AM", "Today by 2PM", "Get It Today", "Get It by Tomorrow"];
const RATING_OPTIONS = [
  { value: 4, label: "4 stars & up" },
  { value: 3, label: "3 stars & up" },
];

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function baseParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of ["q", "department", "sort", "p", "rating", "freeship", "delivery", "minPrice", "maxPrice"]) {
    const v = asString(sp[k]);
    if (v) p.set(k, v);
  }
  return p;
}

function hrefWithout(sp: Record<string, string | string[] | undefined>, key: string) {
  const p = baseParams(sp);
  p.delete(key);
  return `/search?${p.toString()}`;
}

function hrefWith(sp: Record<string, string | string[] | undefined>, key: string, value: string) {
  const p = baseParams(sp);
  p.set(key, value);
  return `/search?${p.toString()}`;
}

function hrefWithoutMany(sp: Record<string, string | string[] | undefined>, keys: string[]) {
  const p = baseParams(sp);
  for (const key of keys) p.delete(key);
  return `/search?${p.toString()}`;
}

function RailLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`group flex items-start gap-2.5 py-1.5 text-sm transition-colors ${active ? "font-semibold text-accent" : "text-text-secondary hover:text-headline"}`}>
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] transition-colors ${active ? "border-accent bg-accent text-accent-ink" : "border-border-strong group-hover:border-accent"}`} aria-hidden="true">
        {active ? "✓" : ""}
      </span>
      <span>{children}</span>
    </Link>
  );
}

function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border py-5 first:pt-0 last:border-b-0 last:pb-0">
      <h2 className="text-sm font-bold text-headline">{title}</h2>
      <div className="mt-3 flex flex-col">{children}</div>
    </section>
  );
}

function PillChip({ active, href, children }: { active: boolean; href: string; children: ReactNode }) {
  return (
    <Link href={href} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-raised text-text-secondary hover:border-accent hover:text-accent"}`}>
      {children}
    </Link>
  );
}

type FilterRailProps = {
  sp: Record<string, string | string[] | undefined>;
  pillar: string;
  delivery: string;
  freeship: boolean;
  rating: number;
  priceFilterSet: boolean;
};

function FilterRail({ sp, pillar, delivery, freeship, rating, priceFilterSet }: FilterRailProps) {
  return (
    <div>
      <RailSection title="Popular shopping ideas">
        {POPULAR_IDEAS.map((term) => {
          const active = pillar.toLowerCase() === term.toLowerCase();
          return <RailLink key={term} active={active} href={active ? hrefWithout(sp, "p") : hrefWith(sp, "p", term)}>{term}</RailLink>;
        })}
        <details className="group mt-1 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-accent [&::-webkit-details-marker]:hidden">See more <span aria-hidden="true">⌄</span></summary>
          <div className="mt-1 flex flex-col">
            {POPULAR_IDEAS_MORE.map((term) => {
              const active = pillar.toLowerCase() === term.toLowerCase();
              return <RailLink key={term} active={active} href={active ? hrefWithout(sp, "p") : hrefWith(sp, "p", term)}>{term}</RailLink>;
            })}
          </div>
        </details>
      </RailSection>
      <RailSection title="Delivery">
        {DELIVERY_OPTIONS.map((option) => {
          const active = delivery === option;
          return <RailLink key={option} active={active} href={active ? hrefWithout(sp, "delivery") : hrefWith(sp, "delivery", option)}>{option}</RailLink>;
        })}
      </RailSection>
      <RailSection title="Service perks">
        <RailLink active={freeship} href={freeship ? hrefWithout(sp, "freeship") : hrefWith(sp, "freeship", "1")}>Delivery eligible</RailLink>
      </RailSection>
      <RailSection title="Customer reviews">
        {RATING_OPTIONS.map((option) => {
          const active = rating === option.value;
          return <RailLink key={option.value} active={active} href={active ? hrefWithout(sp, "rating") : hrefWith(sp, "rating", String(option.value))}>{option.label}</RailLink>;
        })}
      </RailSection>
      <RailSection title="Price">
        <RailLink active={false} href={priceFilterSet ? hrefWithoutMany(sp, ["minPrice", "maxPrice"]) : hrefWith(sp, "maxPrice", "7000")}>Under $70</RailLink>
      </RailSection>
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = asString(sp.q).trim();
  const department = asString(sp.department) || "all";
  const sort = asString(sp.sort) || "featured";
  const pillar = asString(sp.p).trim();
  const rating = parseFloat(asString(sp.rating));
  const freeship = asString(sp.freeship) === "1";
  const delivery = asString(sp.delivery);
  const minPrice = parseFloat(asString(sp.minPrice));
  const maxPrice = parseFloat(asString(sp.maxPrice));

  await connectDB();
  const filter: Record<string, unknown> = {};
  const searchTerm = [q, pillar].filter(Boolean).join(" ");
  if (searchTerm) {
    const re = new RegExp(escapeRegExp(searchTerm), "i");
    filter.$or = [{ title: re }, { brand: re }, { description: re }];
  }
  if (department !== "all") filter.categoryPath = department;
  if (freeship || delivery) filter.primeEligible = true;
  if (!Number.isNaN(rating) && rating > 0) filter.ratingAvg = { $gte: rating };
  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    const range: Record<string, number> = {};
    if (!Number.isNaN(minPrice)) range.$gte = minPrice;
    if (!Number.isNaN(maxPrice)) range.$lte = maxPrice;
    filter["variants.priceCents"] = { ...range, $gt: 0 };
  }

  const sortMap: Record<string, 1 | -1> = sort === "price-asc" ? { "variants.0.priceCents": 1 } : sort === "price-desc" ? { "variants.0.priceCents": -1 } : sort === "rating" ? { ratingAvg: -1 } : sort === "newest" ? { createdAt: -1 } : sort === "bestsellers" ? { boughtInPastMonth: -1 } : { ratingCount: -1 };
  const [docs, totalDocs] = await Promise.all([
    (ProductModel.find(filter).sort(sortMap).limit(40).lean().exec()) as unknown as Promise<Array<Product & { _id: unknown }>>,
    ProductModel.countDocuments(filter).exec(),
  ]);
  const cartState = await getCartState();
  const qtyBySku = new Map<string, number>();
  if (cartState) for (const item of cartState.items) qtyBySku.set(item.variantSku, item.qty);

  const resultsHeading = q ? `${totalDocs === 0 ? 0 : 1}-${Math.min(totalDocs, docs.length)} of ${totalDocs} results for “${q}”${pillar ? ` + ${pillar}` : ""}` : `${totalDocs} results${department !== "all" ? ` in ${department}` : ""}`;
  const priceFilterSet = !Number.isNaN(minPrice) || !Number.isNaN(maxPrice);
  const filterProps = { sp, pillar, delivery, freeship, rating, priceFilterSet };

  return (
    <div className="morrow-container min-h-screen py-8 sm:py-10 lg:py-12">
      <div className="mb-8 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="morrow-eyebrow">Search / refine</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-headline sm:text-5xl">Find your next favorite.</h1>
          <p className="mt-3 text-sm text-text-secondary">{resultsHeading}</p>
        </div>
        <SearchSort q={q} department={department} sort={sort} sp={sp} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3">
        <span className="mr-1 text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Narrow your search</span>
        {NARROW_TOKENS.map((term) => {
          const active = pillar.toLowerCase() === term.toLowerCase();
          return <PillChip key={term} active={active} href={active ? hrefWithout(sp, "p") : hrefWith(sp, "p", term)}>{term}</PillChip>;
        })}
      </div>

      <details className="morrow-panel mb-5 p-4 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-headline [&::-webkit-details-marker]:hidden">
          Refine results <span className="text-accent">⌄</span>
        </summary>
        <div className="mt-4 border-t border-border pt-2"><FilterRail {...filterProps} /></div>
      </details>

      <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="sticky top-24 hidden rounded-2xl border border-border bg-surface p-5 lg:block">
          <FilterRail {...filterProps} />
        </aside>

        <div className="flex min-w-0 items-start gap-5">
          <div className="min-w-0 flex-1 space-y-4">
            {docs.length === 0 ? (
              <div className="morrow-panel p-10 text-center">
                <p className="morrow-eyebrow">No matches yet</p>
                <h2 className="mt-3 font-display text-3xl text-headline">Try a different direction.</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">Check your spelling, remove a filter, or browse the full catalog.</p>
                <Link href="/search" className="morrow-button mt-6">Clear search</Link>
              </div>
            ) : (
              docs.map((doc) => {
                const first = doc.variants[0];
                return (
                  <SerpResultCard
                    key={String(doc._id)}
                    productId={String(doc._id)}
                    slug={doc.slug}
                    title={doc.title}
                    isAmazonBrand={doc.isAmazonBrand}
                    ratingAvg={doc.ratingAvg}
                    ratingCount={doc.ratingCount}
                    boughtInPastMonth={doc.boughtInPastMonth}
                    priceCents={first?.priceCents ?? 0}
                    listPriceCents={first?.listPriceCents ?? undefined}
                    image={first?.images?.[0] ?? doc.images?.[0] ?? ""}
                    variantSku={first?.sku ?? ""}
                    stock={first?.stock ?? 0}
                    carbonImpact={doc.carbonImpact}
                    initialQty={qtyBySku.get(first?.sku ?? "") ?? 0}
                    deliveryDate={deliveryPromisesPage}
                  />
                );
              })
            )}
          </div>
          <div className="hidden w-64 shrink-0 xl:block"><MiniCart /></div>
        </div>
      </div>
    </div>
  );
}
