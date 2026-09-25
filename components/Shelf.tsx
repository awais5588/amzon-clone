import Link from "next/link";
import type { ProductCardData } from "./ProductCard";
import { ProductCard } from "./ProductCard";

export function Shelf({
  title,
  note,
  cards,
  seeMore,
}: {
  title: string;
  note?: string;
  cards: ProductCardData[];
  seeMore?: { href: string; label?: string };
}) {
  if (cards.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_14px_34px_rgba(0,0,0,0.14)] sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="morrow-eyebrow">Curated for you</p>
          <h2 className="mt-2 font-display text-2xl leading-tight text-headline sm:text-3xl">{title}</h2>
          {note && <p className="mt-1 text-sm text-text-secondary">{note}</p>}
        </div>
        {seeMore && (
          <Link href={seeMore.href} className="morrow-link shrink-0 text-sm">
            {seeMore.label ?? "View all"} <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
      <div className="-mx-1 grid grid-cols-2 gap-3 px-1 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <ProductCard key={card.slug} product={card} />
        ))}
      </div>
    </section>
  );
}
