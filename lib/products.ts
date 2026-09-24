import type { ProductDoc, Product } from "@/lib/models";
import type { ProductCardData } from "@/components/ProductCard";

export function productToCard(p: ProductDoc | Product): ProductCardData {
  const first = p.variants?.[0];
  return {
    slug: p.slug,
    title: p.title,
    image: (first?.images?.[0] ?? p.images?.[0]) || "",
    priceCents: first?.priceCents ?? 0,
    listPriceCents: first?.listPriceCents ?? undefined,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    boughtInPastMonth: p.boughtInPastMonth,
  };
}

export async function fetchProductsBySlugs(slugs: string[]): Promise<Record<string, Product>> {
  const { ProductModel } = await import("@/lib/models");
  const { connectDB } = await import("@/lib/mongoose");
  await connectDB();
  const docs = (await ProductModel.find({ slug: { $in: slugs } })
    .lean()
    .exec()) as unknown as Product[];
  const bySlug: Record<string, Product> = {};
  for (const d of docs) bySlug[d.slug] = d;
  return bySlug;
}