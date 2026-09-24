import Image from "next/image";
import type { ProductCardData } from "@/components/ProductCard";
import { Shelf } from "@/components/Shelf";
import { formatPrice } from "@/lib/format";
import { fetchProductsBySlugs, productToCard } from "@/lib/products";

export const dynamic = "force-dynamic";

const PRIME_PROMOS = [
  { eyes: "The fall edit", note: "Shop premium brands", img: "fall-edit", href: "/search?q=fall" },
  { eyes: "Shop Halloween", note: "candy picks", img: "halloween-candy", href: "/search?q=candy" },
  { eyes: "New sportswear and more", note: "Stay active with Nike", img: "nike-sportswear", href: "/search?q=nike" },
  { eyes: "Spend less every day", note: "Customer-loved finds under $20", img: "finds-under-20", href: "/search?maxPrice=2000" },
];

function PromoCard({ eyes, note, img, href }: { eyes: string; note: string; img: string; href: string }) {
  return (
    <a href={href} className="group block bg-card p-3 pb-0 rounded-sm shadow-sm hover:shadow-md transition-shadow">
      <p className="font-bold text-[15px] leading-snug text-headline">{eyes}</p>
      <p className="text-[13px] text-muted mb-2">{note}</p>
      <div className="overflow-hidden">
        <Image
          src={`https://picsum.photos/seed/${img}/600/400`}
          alt={eyes}
          width={600}
          height={400}
          className="w-full aspect-[3/2] object-cover group-hover:scale-[1.02] transition-transform"
          sizes="(min-width:1280px) 25vw, 50vw"
        />
      </div>
    </a>
  );
}

function PrimeFocus() {
  return (
    <div className="bg-gradient-to-b from-[#2b4c68] to-[#131921] text-white rounded-sm p-5 flex flex-col justify-center gap-1.5 shadow-sm">
      <p className="text-[13px] text-[#e7f1ff]">Exclusively for members</p>
      <p className="text-2xl font-semibold leading-tight">Prime Big Deals</p>
      <p className="text-sm text-[#d3e1ee] mb-2">drop Oct 6-7</p>
      <span className="inline-flex justify-center bg-cta border border-cta-border text-headline text-sm font-semibold rounded-[4px] px-4 py-1.5 w-fit shadow-sm hover:bg-[#f7ca00]">
        Join Prime
      </span>
    </div>
  );
}

async function AmazonDevices() {
  const bySlug = await fetchProductsBySlugs([
    "fire-tv-stick-4k-max",
    "fire-tv-stick-4k-plus",
    "echo-dot-5th-gen",
    "kindle-paperwhite-16gb",
  ]);
  const slugs = ["fire-tv-stick-4k-max", "fire-tv-stick-4k-plus", "echo-dot-5th-gen", "kindle-paperwhite-16gb"];
  const cards = slugs.filter((s) => bySlug[s]).map((s) => productToCard(bySlug[s]));
  if (cards.length === 0) return null;
  return <Shelf title="Top-selling Amazon Devices" cards={cards} />;
}

async function DiscoverShelf() {
  const bySlug = await fetchProductsBySlugs([
    "sour-patch-kids",
    "lego-botanical-roses",
    "nike-running-shirt",
    "stanley-quencher-tumbler",
    "kindle-paperwhite-16gb",
  ]);
  const candies: ProductCardData[] = [];
  for (const s of ["sour-patch-kids", "lego-botanical-roses", "nike-running-shirt", "stanley-quencher-tumbler", "kindle-paperwhite-16gb"]) {
    if (bySlug[s]) candies.push(productToCard(bySlug[s]));
  }
  return <Shelf title="You might like" note="Sponsored · picks we think you'll love" cards={candies} />;
}

export default async function Home() {
  return (
    <div className="min-h-screen">
      <h1 className="sr-only">Amazon. Shop today&apos;s deals, electronics, books and more.</h1>
      {/* Hero: Prime focus column + promo grid */}
      <div className="max-w-[1500px] mx-auto px-3 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-3">
          <PrimeFocus />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRIME_PROMOS.map((p) => (
              <PromoCard key={p.img} {...p} />
            ))}
          </div>
        </div>

        {/* Candy features */}
        <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CandyTile slug="brachs-autumn-mix" title="Brach's Autumn Mix" capture="Harvest-time candy favorite" img="brachs-autumn-mix" />
          <CandyTile slug="sour-patch-kids" title="Sour Patch Kids" capture="Soft & chewy, silly sour" img="sour-patch-kids" />
        </section>

        <div className="mt-4 space-y-4 pb-6">
          <AmazonDevices />
          <DiscoverShelf />
        </div>
      </div>
    </div>
  );
}

async function fetchPrice(slug: string): Promise<number> {
  const bySlug = await fetchProductsBySlugs([slug]);
  return bySlug[slug]?.variants?.[0]?.priceCents ?? 0;
}

async function CandyTile({ slug, title, capture, img }: { slug: string; title: string; capture: string; img: string }) {
  const price = await fetchPrice(slug);
  return (
    <a
      href={`/product/${slug}`}
      className="group flex items-stretch bg-card rounded-sm shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="w-2/5 overflow-hidden">
        <Image
          src={`https://picsum.photos/seed/${img}/400/400`}
          alt={title}
          width={400}
          height={400}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
        />
      </div>
      <div className="flex-1 p-4 flex flex-col justify-center gap-1">
        <span className="text-[11px] uppercase tracking-wider text-muted">Sponsored</span>
        <h3 className="font-bold text-headline leading-snug group-hover:text-link group-hover:underline">{title}</h3>
        <p className="text-[13px] text-muted">{capture}</p>
        <p className="text-lg font-semibold text-headline mt-1">{formatPrice(price)}</p>
      </div>
    </a>
  );
}