/**
 * P8 fixture prep: creates a fresh signed-in user + a 2-line cart (skuA qty2, skuB qty3),
 * recording original stock so the partial-purchase check can assert exact decrements.
 * Run: npx tsx scripts/p8-prep.ts <out.json>
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { connectDB } from "../lib/mongoose";
import { UserModel, CartModel, ProductModel } from "../lib/models";
import { hashPassword } from "../lib/auth/password";
import { createSessionRecord } from "../lib/auth/session-core";

interface FixtureDoc {
  stamp: string;
  userRawId: string;
  userId: string;
  token: string;
  email: string;
  skuA: string;
  skuB: string;
  titleALive: string;
  titleBLive: string;
  totalA: number;
  totalB: number;
  stockAOrig: number;
  stockBOrig: number;
  orderKeyPartial: string;
}

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("usage: p8-prep.ts <out.json>");
  const stamp = Date.now().toString(36) + randomUUID().slice(0, 4);
  await connectDB();

  const skuA = "ECHO-DOT5-CHAR";
  const skuB = "FTV-4KMAX-PRO";
  const products = (await ProductModel.find({
    "variants.sku": { $in: [skuA, skuB] },
  })
    .lean()
    .exec()) as unknown as Array<{
    _id: unknown;
    title: string;
    variants: Array<{ sku: string; priceCents: number; stock: number; images?: string[] }>;
  }>;
  const pa = products.find((p) => p.variants.some((v) => v.sku === skuA))!;
  const pb = products.find((p) => p.variants.some((v) => v.sku === skuB))!;
  const va = pa.variants.find((v) => v.sku === skuA)!;
  const vb = pb.variants.find((v) => v.sku === skuB)!;
  if (va.stock < 2 || vb.stock < 3) throw new Error("fixture skus lack stock");

  const email = `p8-partial-${stamp}@example.com`;
  const user = await UserModel.create({
    name: "P8 Partial Buyer",
    email,
    passwordHash: await hashPassword("pw-p8-123"),
  } as never);
  const token = await createSessionRecord(String(user._id));
  const userId = `user:${String(user._id)}`;

  await CartModel.deleteMany({ userId });
  await CartModel.create({
    userId,
    items: [
      {
        product: String(pa._id),
        variantSku: skuA,
        title: `${pa.title} (P8-SEL)`,
        image: va.images?.[0] ?? "",
        priceCents: va.priceCents,
        qty: 2,
      },
      {
        product: String(pb._id),
        variantSku: skuB,
        title: `${pb.title} (P8-KEEP)`,
        image: vb.images?.[0] ?? "",
        priceCents: vb.priceCents,
        qty: 3,
      },
    ],
  } as never);

  const fix: FixtureDoc = {
    stamp,
    userRawId: String(user._id),
    userId,
    token,
    email,
    skuA,
    skuB,
    totalA: va.priceCents * 2,
    totalB: vb.priceCents * 3,
    titleALive: pa.title,
    titleBLive: pb.title,
    stockAOrig: va.stock,
    stockBOrig: vb.stock,
    orderKeyPartial: `p8-partial-${stamp}`,
  };
  writeFileSync(out, JSON.stringify(fix, null, 2));
  console.log(`P8 fixture written: ${out}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
