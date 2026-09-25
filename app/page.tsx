import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/models";
import { ProductModel } from "@/lib/models";
import { connectDB } from "@/lib/mongoose";
import { productToCard } from "@/lib/products";
import { formatPrice, formatRating } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Shelf } from "@/components/Shelf";
import { Stars } from "@/components/Stars";

export const dynamic = "force-dynamic";

function productImage(product: Product): string {
  return product.variants?.[0]?.images?.[0] ?? product.images?.[0] ?? "/images/placeholder.png";
}

async function getHomepageProducts() {
  await connectDB();
  const docs = (await ProductModel.find({})
    .sort({ boughtInPastMonth: -1, ratingCount: -1, createdAt: -1 })
    .limit(40)
    .lean()
    .exec()) as unknown as Product[];

  const featured = docs[0];
  const edit = docs.slice(0, 8).map(productToCard);
  const wanted = docs.slice(8, 12).map(productToCard);
  const categoryMap = new Map<string, Product>();
  for (const product of docs) {
    const category = product.categoryPath?.[0];
    if (category && !categoryMap.has(category)) categoryMap.set(category, product);
  }
  return { featured, edit, wanted, categories: [...categoryMap.values()].slice(0, 4) };
}

function Hero({ product }: { product?: Product }) {
  const image = product ? productImage(product) : "/images/placeholder.png";
  const firstVariant = product?.variants?.[0];
  return (
    <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_38%,rgba(167,139,250,0.22),transparent_28%),radial-gradient(circle_at_18%_100%,rgba(72,61,119,0.2),transparent_34%)]" />
      <div className="grid min-h-[28rem] items-center gap-8 p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
        <div className="max-w-xl">
          <p className="morrow-eyebrow">{BRAND.eyebrow}</p>
          <h1 className="mt-5 max-w-lg font-display text-5xl leading-[0.98] tracking-[-0.045em] text-headline sm:text-6xl lg:text-7xl">
            Good things, found with intention.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-text-secondary sm:text-lg">
            A more considered way to browse the catalog. Clear details, confident choices, and a calmer path from first look to checkout.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/search" className="morrow-button">
              Explore the edit <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/search?sort=newest" className="morrow-button-secondary">
              See what&apos;s new
            </Link>
          </div>
        </div>

        {product ? (
          <Link href={`/product/${product.slug}`} className="group relative mx-auto block w-full max-w-xl">
            <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-accent/10 blur-3xl transition-opacity duration-300 group-hover:opacity-80" />
            <div className="relative aspect-[1.05/1] overflow-hidden rounded-[1.5rem] border border-border bg-surface-raised/80 p-5 shadow-[0_22px_55px_rgba(0,0,0,0.28)] sm:p-8">
              <div className="absolute left-6 top-6 z-10 rounded-full border border-accent/30 bg-surface/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent backdrop-blur">
                In focus
              </div>
              <Image
                src={image}
                alt={product.title}
                fill
                priority
                className="object-contain p-8 transition-transform duration-300 group-hover:scale-[1.025]"
                sizes="(min-width:1024px) 52vw, 90vw"
              />
            </div>
            <div className="relative -mt-5 ml-4 mr-4 flex items-end justify-between gap-4 rounded-2xl border border-border bg-surface-raised/95 p-4 shadow-[0_16px_34px_rgba(0,0,0,0.25)] backdrop-blur sm:ml-8 sm:mr-8 sm:p-5">
              <div className="min-w-0">
                <p className="morrow-eyebrow">{product.brand}</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold text-headline sm:text-base">{product.title}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                  <span className="font-bold text-star">{formatRating(product.ratingAvg)}</span>
                  <Stars rating={product.ratingAvg} />
                  <span>{product.ratingCount} ratings</span>
                </div>
              </div>
              <p className="shrink-0 text-xl font-extrabold tracking-[-0.04em] text-headline sm:text-2xl">{formatPrice(firstVariant?.priceCents ?? 0)}</p>
            </div>
          </Link>
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-xl items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-surface-raised/60 p-8 text-center text-sm text-text-secondary">
            The catalog is ready for its first edit.
          </div>
        )}
      </div>
    </section>
  );
}

function SignalStrip() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        ["01", "Curated catalog", "A clear starting point for every browse."],
        ["02", "Live product detail", "The information you need, kept close."],
        ["03", "A calmer checkout", "Fewer distractions when it matters most."],
      ].map(([number, title, note]) => (
        <div key={number} className="rounded-2xl border border-border bg-surface/70 p-5">
          <span className="text-xs font-bold text-accent">{number}</span>
          <p className="mt-3 text-sm font-bold text-headline">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">{note}</p>
        </div>
      ))}
    </div>
  );
}

function CategoryTile({ product }: { product: Product }) {
  const category = product.categoryPath?.[0] ?? "Explore";
  return (
    <Link
      href={`/search?department=${encodeURIComponent(category)}`}
      className="group relative isolate flex min-h-48 overflow-hidden rounded-2xl border border-border bg-surface-raised p-5 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-accent"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,rgba(167,139,250,0.16),transparent_45%)]" />
      <Image
        src={productImage(product)}
        alt=""
        fill
        className="-z-10 object-cover opacity-25 mix-blend-screen transition-transform duration-300 group-hover:scale-105"
        sizes="(min-width:768px) 25vw, 50vw"
      />
      <div className="mt-auto">
        <p className="morrow-eyebrow">Shop by department</p>
        <h3 className="mt-2 text-xl font-bold text-headline transition-colors group-hover:text-accent">{category}</h3>
        <span className="mt-3 inline-flex text-sm font-semibold text-text-secondary transition-colors group-hover:text-accent">Explore <span aria-hidden="true" className="ml-1">↗</span></span>
      </div>
    </Link>
  );
}

function ProductSpotlight({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="flex flex-col justify-between rounded-2xl border border-accent/30 bg-accent-soft p-6 sm:p-8">
        <div>
          <p className="morrow-eyebrow">A little closer</p>
          <h2 className="mt-3 max-w-sm font-display text-3xl leading-tight text-headline sm:text-4xl">The details make the difference.</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">Take a second look at the pieces people are finding useful right now.</p>
        </div>
        <Link href="/search?sort=bestsellers" className="morrow-link mt-8 w-fit text-sm">See what&apos;s moving <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {products.slice(0, 2).map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  const { featured, edit, wanted, categories } = await getHomepageProducts();
  return (
    <div className="morrow-container min-h-screen py-8 sm:py-10 lg:py-12">
      <h1 className="sr-only">{BRAND.name} — {BRAND.descriptor}</h1>
      <div className="space-y-10 lg:space-y-14">
        <Hero product={featured} />
        <SignalStrip />
        {edit.length > 0 && <Shelf title="The Morrow edit" note="A considered selection from the live catalog." cards={edit} seeMore={{ href: "/search", label: "View all" }} />}
        {categories.length > 0 && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="morrow-eyebrow">Find your direction</p>
                <h2 className="mt-2 font-display text-3xl text-headline">Browse by department</h2>
              </div>
              <Link href="/search" className="morrow-link hidden text-sm sm:inline-flex">All products <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {categories.map((product) => <CategoryTile key={product.slug} product={product} />)}
            </div>
          </section>
        )}
        <ProductSpotlight products={wanted} />
        {wanted.length > 0 && <Shelf title="Most wanted" note="Popular choices, pulled from the catalog." cards={wanted} seeMore={{ href: "/search?sort=bestsellers", label: "See more" }} />}
      </div>
    </div>
  );
}
