import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { ProductModel, ReviewModel, type Product } from "@/lib/models";
import { productToCard } from "@/lib/products";
import { getCartState } from "@/lib/cart";
import { ProductView, type ProductViewData, type ProductVariantView } from "@/components/ProductView";
import { ProductsHeader } from "@/components/ProductsHeader";
import { Reviews, type ReviewView } from "@/components/Reviews";
import { Shelf } from "@/components/Shelf";
import { formatThousands, formatRating, deliveryPromises } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProductRow = Product & { _id: unknown; createdAt?: unknown };

function serializeProduct(product: ProductRow): ProductViewData {
  const variants: ProductVariantView[] = product.variants.map((variant) => ({
    label: variant.label,
    sku: variant.sku,
    priceCents: variant.priceCents,
    listPriceCents: variant.listPriceCents ?? undefined,
    stock: variant.stock,
    images: variant.images ?? [],
  }));
  return {
    productId: String(product._id),
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    isAmazonBrand: product.isAmazonBrand,
    description: product.description,
    bullets: product.bullets ?? [],
    images: product.images ?? [],
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    boughtInPastMonth: product.boughtInPastMonth,
    bestsellerRank: product.bestsellerRank || undefined,
    primeEligible: product.primeEligible,
    freeReturns: product.freeReturns,
    carbonImpact: product.carbonImpact,
    seller: product.seller,
    variants,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const document = (await ProductModel.findOne({ slug }).lean().exec()) as unknown as ProductRow | null;
  return { title: document?.title ?? slug, description: document?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connectDB();
  const document = (await ProductModel.findOne({ slug }).lean().exec()) as unknown as ProductRow | null;
  if (!document) notFound();

  const productId = String(document._id);
  const reviewDocuments = (await ReviewModel.find({ product: productId }).sort({ helpfulCount: -1 }).limit(8).lean().exec()) as unknown as Array<{
    userName: string;
    rating: number;
    title: string;
    body: string;
    verifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: unknown;
  }>;
  const reviews: ReviewView[] = reviewDocuments.map((review) => ({
    userName: review.userName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    verifiedPurchase: review.verifiedPurchase,
    helpfulCount: review.helpfulCount,
    createdAt: new Date(String(review.createdAt)).toISOString(),
  }));

  const relatedDocuments = (await ProductModel.find({ slug: { $ne: slug }, categoryPath: document.categoryPath[0] }).limit(4).lean().exec()) as unknown as ProductRow[];
  const fallbackDocuments = relatedDocuments.length
    ? relatedDocuments
    : ((await ProductModel.find({ slug: { $ne: slug } }).limit(4).lean().exec()) as unknown as ProductRow[]);
  const cart = await getCartState();
  const initialQtyBySku: Record<string, number> = {};
  for (const item of cart.items) {
    if (document.variants.some((variant) => variant.sku === item.variantSku)) initialQtyBySku[item.variantSku] = item.qty;
  }
  const related = fallbackDocuments.map((product) => productToCard(product));

  return (
    <div className="morrow-container min-h-screen py-7 sm:py-10 lg:py-12">
      <nav className="mb-6 flex items-center gap-2 text-xs text-text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/search" className="hover:text-accent">Catalog</Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-text-secondary">{document.title}</span>
      </nav>
      <ProductsHeader title={document.title} brand={document.brand} isAmazonBrand={document.isAmazonBrand} ratingAvg={document.ratingAvg} ratingCount={document.ratingCount} boughtInPastMonth={document.boughtInPastMonth} />
      <div className="mt-8"><ProductView product={serializeProduct(document)} initialQtyBySku={initialQtyBySku} deliveryDate={deliveryPromises()} /></div>

      <section className="morrow-panel mt-10 p-5 sm:p-7">
        <p className="morrow-eyebrow">The useful bits</p>
        <h2 className="mt-2 font-display text-3xl text-headline">Product details</h2>
        {document.bullets.length > 0 && <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">{document.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
        <p className="mt-5 max-w-4xl text-sm leading-relaxed text-text-secondary">{document.description}</p>
        <div className="mt-6 grid gap-4 border-t border-border pt-5 text-sm text-text-secondary sm:grid-cols-2">
          <p><span className="font-bold text-headline">Brand</span><br />{document.brand}</p>
          <p><span className="font-bold text-headline">Customer rating</span><br />{formatRating(document.ratingAvg)} out of 5 · {formatThousands(document.ratingCount)} ratings</p>
          <p><span className="font-bold text-headline">Popularity</span><br />{formatThousands(document.boughtInPastMonth)}+ bought in the past month</p>
          <p><span className="font-bold text-headline">Carbon impact</span><br />{document.carbonImpact}</p>
        </div>
      </section>

      <div className="mt-10" id="customer-reviews">
        <Reviews average={document.ratingAvg} total={document.ratingCount} bought={document.boughtInPastMonth} reviews={reviews} />
      </div>

      {related.length > 0 && <div className="mt-10"><Shelf title="You might also like" note={`More considered picks from ${document.brand}.`} cards={related} /></div>}
    </div>
  );
}
