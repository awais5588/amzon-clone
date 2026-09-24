import type { ReactNode } from "react";
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
const DELIVERY_OPTIONS = [
  "Today by 8AM",
  "Today by 2PM",
  "Get It Today",
  "Get It by Tomorrow",
];
const RATING_OPTIONS = [
  { value: 4, label: "★★★★★ & Up" },
  { value: 3, label: "★★★★ & Up" },
];

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function baseParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of [
    "q",
    "department",
    "sort",
    "p",
    "rating",
    "freeship",
    "delivery",
    "minPrice",
    "maxPrice",
  ]) {
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
  for (const k of keys) p.delete(k);
  return `/search?${p.toString()}`;
}

function RailLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={`flex items-start gap-2 py-0.5 text-[13px] hover:text-link ${
        active ? "text-link font-medium" : "text-headline"
      }`}
    >
      <span className="mt-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border border-[#8f9ba3] shrink-0 bg-card">
        {active && <span className="text-[10px] leading-none -mt-0.5">✓</span>}
      </span>
      <span>{children}</span>
    </a>
  );
}

function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border pb-3 mb-3 last:border-b-0 last:mb-0 last:pb-0">
      <h3 className="text-[13px] font-bold text-headline mb-1">{title}</h3>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function PillChip({ active, href, children }: { active: boolean; href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className={`border border-border rounded-full px-3 py-1 text-[13px] whitespace-nowrap transition-colors ${
        active ? "bg-navbar text-white border-navbar" : "bg-card text-link hover:border-link"
      }`}
    >
      {children}
    </a>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
    filter["variants.priceCents"] = { ...range, "$gt": 0 };
  }

  const sortMap: Record<string, 1 | -1> =
    sort === "price-asc"
      ? { "variants.0.priceCents": 1 }
      : sort === "price-desc"
        ? { "variants.0.priceCents": -1 }
        : sort === "rating"
          ? { ratingAvg: -1 }
          : sort === "newest"
            ? { createdAt: -1 }
            : sort === "bestsellers"
              ? { boughtInPastMonth: -1 }
              : { ratingCount: -1 };

  const [docs, totalDocs] = await Promise.all([
    (ProductModel.find(filter).sort(sortMap).limit(40).lean().exec()) as unknown as Promise<
      Array<Product & { _id: unknown }>
    >,
    ProductModel.countDocuments(filter).exec(),
  ]);

  const cartState = await getCartState();
  const qtyBySku = new Map<string, number>();
  if (cartState) {
    for (const i of cartState.items) qtyBySku.set(i.variantSku, i.qty);
  }

  const resultsHeading = q
    ? `${totalDocs === 0 ? 0 : 1}-${Math.min(totalDocs, docs.length)} of ${totalDocs} results for "${q}"${pillar ? ` + ${pillar}` : ""}`
    : `${totalDocs} results${department !== "all" ? ` in ${department}` : ""}`;

  const priceFilterSet = !Number.isNaN(minPrice) || !Number.isNaN(maxPrice);

  return (
    <div className="max-w-[1500px] mx-auto px-3 py-3 min-h-screen">
      <h1 className="sr-only">{resultsHeading}</h1>
      {/* Header: results count + sort */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-[13px] text-muted">{resultsHeading}</p>
        <SearchSort
          q={q}
          department={department}
          sort={sort}
          sp={sp}
        />
      </div>

      {/* Narrow your search pills */}
      <div className="bg-card rounded-sm shadow-sm px-3 py-2.5 mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[13px] font-bold text-headline mr-1">Narrow your search</span>
        {NARROW_TOKENS.map((t) => (
          <PillChip
            key={t}
            active={pillar.toLowerCase() === t.toLowerCase()}
            href={
              pillar.toLowerCase() === t.toLowerCase()
                ? hrefWithout(sp, "p")
                : hrefWith(sp, "p", t)
            }
          >
            {t}
          </PillChip>
        ))}
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-4 items-start">
        {/* Left refinement rail */}
        <aside className="bg-card rounded-sm shadow-sm px-3 py-3 md:sticky md:top-3">
          <RailSection title="Popular Shopping Ideas">
            {POPULAR_IDEAS.map((t) => {
              const active = pillar.toLowerCase() === t.toLowerCase();
              return (
                <RailLink
                  key={t}
                  active={active}
                  href={active ? hrefWithout(sp, "p") : hrefWith(sp, "p", t)}
                >
                  {t}
                </RailLink>
              );
            })}
            <details className="group text-[13px] mt-1">
              <summary className="cursor-pointer text-link hover:text-link-hover list-none flex items-center gap-1">
                <span className="text-headline">•</span> See more
              </summary>
              <div className="flex flex-col mt-1">
                {POPULAR_IDEAS_MORE.map((t) => {
                  const active = pillar.toLowerCase() === t.toLowerCase();
                  return (
                    <RailLink
                      key={t}
                      active={active}
                      href={active ? hrefWithout(sp, "p") : hrefWith(sp, "p", t)}
                    >
                      {t}
                    </RailLink>
                  );
                })}
              </div>
            </details>
          </RailSection>

          <RailSection title="Prime Delivery">
            <div className="text-[12px] text-faint pl-5 mb-1">Delivery Day</div>
            {DELIVERY_OPTIONS.map((opt) => {
              const active = delivery === opt;
              return (
                <RailLink
                  key={opt}
                  active={active}
                  href={active ? hrefWithout(sp, "delivery") : hrefWith(sp, "delivery", opt)}
                >
                  {opt}
                </RailLink>
              );
            })}
          </RailSection>

          <RailSection title="Free Shipping Eligible">
            <RailLink
              active={freeship}
              href={freeship ? hrefWithout(sp, "freeship") : hrefWith(sp, "freeship", "1")}
            >
              Free Shipping
            </RailLink>
          </RailSection>

          <RailSection title="Customer Reviews">
            {RATING_OPTIONS.map((o) => {
              const active = rating === o.value;
              return (
                <RailLink
                  key={o.value}
                  active={active}
                  href={active ? hrefWithout(sp, "rating") : hrefWith(sp, "rating", String(o.value))}
                >
                  {o.label}
                </RailLink>
              );
            })}
          </RailSection>

          <RailSection title="Price">
            <RailLink
              active={false}
              href={priceFilterSet ? hrefWithoutMany(sp, ["minPrice", "maxPrice"]) : hrefWith(sp, "maxPrice", "7000")}
            >
              $1 - $70+
            </RailLink>
          </RailSection>
        </aside>

        {/* Results + mini-cart */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2.5">
            {docs.length === 0 ? (
              <div className="bg-card rounded-sm shadow-sm p-8 text-center">
                <h2 className="text-lg font-semibold mb-1">No results found</h2>
                <p className="text-sm text-muted">
                  Try checking your spelling or use fewer keywords.
                </p>
                <a href="/search" className="inline-block mt-3 text-sm text-link hover:underline">
                  Clear search
                </a>
              </div>
            ) : (
              docs.map((d) => {
                const first = d.variants[0];
                return (
                  <SerpResultCard
                    key={String(d._id)}
                    productId={String(d._id)}
                    slug={d.slug}
                    title={d.title}
                    isAmazonBrand={d.isAmazonBrand}
                    ratingAvg={d.ratingAvg}
                    ratingCount={d.ratingCount}
                    boughtInPastMonth={d.boughtInPastMonth}
                    priceCents={first?.priceCents ?? 0}
                    listPriceCents={first?.listPriceCents ?? undefined}
                    image={first?.images?.[0] ?? d.images?.[0] ?? ""}
                    variantSku={first?.sku ?? ""}
                    stock={first?.stock ?? 0}
                    carbonImpact={d.carbonImpact}
                    initialQty={qtyBySku.get(first?.sku ?? "") ?? 0}
                    deliveryDate={deliveryPromisesPage}
                  />
                );
              })
            )}
          </div>

          <div className="hidden xl:block sticky top-3 shrink-0">
            <MiniCart />
          </div>
        </div>
      </div>
    </div>
  );
}