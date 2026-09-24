import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongoose";
import { ProductModel, ReviewModel, type Product } from "@/lib/models";
import { productToCard } from "@/lib/products";
import { getCartState, readGuestCartId } from "@/lib/cart";
import { ProductView, type ProductViewData, type ProductVariantView } from "@/components/ProductView";
import { ProductsHeader } from "@/components/ProductsHeader";
import { Reviews, type ReviewView } from "@/components/Reviews";
import { Shelf } from "@/components/Shelf";
import { formatThousands, formatRating } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProductRow = Product & { _id: unknown; createdAt?: unknown };

function serializeProduct(p: ProductRow): ProductViewData {
  const variants: ProductVariantView[] = p.variants.map((v) => ({
    label: v.label,
    sku: v.sku,
    priceCents: v.priceCents,
    listPriceCents: v.listPriceCents ?? undefined,
    stock: v.stock,
    images: v.images ?? [],
  }));
  return {
    productId: String(p._id),
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    isAmazonBrand: p.isAmazonBrand,
    description: p.description,
    bullets: p.bullets ?? [],
    images: p.images ?? [],
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    boughtInPastMonth: p.boughtInPastMonth,
    bestsellerRank: p.bestsellerRank || undefined,
    primeEligible: p.primeEligible,
    freeReturns: p.freeReturns,
    carbonImpact: p.carbonImpact,
    seller: p.seller,
    variants,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const doc = (await ProductModel.findOne({ slug })
    .lean()
    .exec()) as unknown as ProductRow | null;
  return { title: doc?.title ?? slug };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connectDB();

  const doc = (await ProductModel.findOne({ slug })
    .lean()
    .exec()) as unknown as ProductRow | null;
  if (!doc) notFound();

  const productId = String(doc._id);

  const reviewDocs = (await ReviewModel.find({ product: productId })
    .sort({ helpfulCount: -1 })
    .limit(8)
    .lean()
    .exec()) as unknown as Array<{
    userName: string;
    rating: number;
    title: string;
    body: string;
    verifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: unknown;
  }>;

  const reviews: ReviewView[] = reviewDocs.map((r) => ({
    userName: r.userName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verifiedPurchase: r.verifiedPurchase,
    helpfulCount: r.helpfulCount,
    createdAt: new Date(String(r.createdAt)).toISOString(),
  }));

  const relatedDocs = (await ProductModel.find({
    slug: { $ne: slug },
    categoryPath: doc.categoryPath[0],
  })
    .limit(4)
    .lean()
    .exec()) as unknown as ProductRow[];

  const fallbackDocs = relatedDocs.length
    ? relatedDocs
    : ((await ProductModel.find({ slug: { $ne: slug } })
        .limit(4)
        .lean()
        .exec()) as unknown as ProductRow[]);

  const guestCartId = await readGuestCartId();
  const cartState = guestCartId ? await getCartState(guestCartId) : null;
  const initialQtyBySku: Record<string, number> = {};
  if (cartState) {
    for (const item of cartState.items) {
      if (doc.variants.some((v) => v.sku === item.variantSku)) {
        initialQtyBySku[item.variantSku] = item.qty;
      }
    }
  }

  const related = fallbackDocs.map((d) => productToCard(d));

  return (
    <div className="max-w-[1500px] mx-auto px-3 py-4 min-h-screen">
      {/* Title / brand / ratings header */}
      <ProductsHeader
        title={doc.title}
        brand={doc.brand}
        isAmazonBrand={doc.isAmazonBrand}
        ratingAvg={doc.ratingAvg}
        ratingCount={doc.ratingCount}
        boughtInPastMonth={doc.boughtInPastMonth}
      />

      <div className="mt-4">
        <ProductView product={serializeProduct(doc)} initialQtyBySku={initialQtyBySku} />
      </div>

      {/* Product details */}
      <section className="bg-card rounded-sm shadow-sm px-4 py-5 mt-4">
        <h2 className="text-xl font-semibold text-headline mb-3">Product details</h2>
        {(doc.bullets?.length ?? 0) > 0 && (
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-headline mb-4">
            {doc.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-[#0f1111] leading-relaxed">{doc.description}</p>

        <div className="mt-4 grid sm:grid-cols-2 gap-4 text-[13px] text-muted border-t border-border pt-3">
          <p>
            <span className="font-semibold text-headline">Brand:</span> {doc.brand}
          </p>
          <p>
            <span className="font-semibold text-headline">Bought in past month:</span>{" "}
            {formatThousands(doc.boughtInPastMonth)}+
          </p>
          <p>
            <span className="font-semibold text-headline">Rating:</span> {formatRating(doc.ratingAvg)}{" "}
            out of 5 ({formatThousands(doc.ratingCount)} ratings)
          </p>
          {doc.carbonImpact && (
            <p>
              <span className="font-semibold text-headline">Carbon impact:</span> {doc.carbonImpact}
            </p>
          )}
        </div>
      </section>

      {/* Reviews */}
      <div className="mt-4" id="customer-reviews">
        <Reviews
          average={doc.ratingAvg}
          total={doc.ratingCount}
          bought={doc.boughtInPastMonth}
          reviews={reviews}
        />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-4">
          <Shelf title="Products related to this item" note={`Similar to ${doc.brand} picks`} cards={related} />
        </div>
      )}
    </div>
  );
}