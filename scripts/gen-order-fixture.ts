import { connectDB } from "@/lib/mongoose";
import { UserModel, CartModel, ProductModel } from "@/lib/models";
import { createSessionRecord } from "@/lib/auth/session-core";
import { hashPassword } from "@/lib/auth/password";

const now = new Date();
const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
  now.getDate()
).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(
  2,
  "0"
)}${String(now.getSeconds()).padStart(2, "0")}${Math.floor(Math.random() * 1000)
  .toString()
  .padStart(3, "0")}`;

async function createUser(email: string): Promise<{ id: string; token: string }> {
  await UserModel.deleteMany({ email });
  const doc = await UserModel.create({
    name: "Order Smoke",
    email,
    passwordHash: await hashPassword("pw-smoke-456"),
  } as never);
  const token = await createSessionRecord(String(doc._id));
  return { id: String(doc._id), token };
}

async function main() {
  await connectDB();

  const skuA = "ECHO-DOT5-CHAR";
  const skuB = "FTV-4KMAX-PRO";

  const [rowA, rowB] = (await ProductModel.find({
    "variants.sku": { $in: [skuA, skuB] },
  })
    .lean()
    .exec()) as unknown as Array<{
    _id: unknown;
    variants: Array<{ sku: string; priceCents: number; stock: number }>;
  }>;

  const va = rowA.variants.find((v) => v.sku === skuA)!;
  const vb = rowB.variants.find((v) => v.sku === skuB)!;

  const owner = await createUser(`smoke-order-owner-${stamp}@example.com`);
  const other = await createUser(`smoke-order-other-${stamp}@example.com`);

  await CartModel.deleteMany({ userId: `user:${owner.id}` });
  await CartModel.create({
    userId: `user:${owner.id}`,
    items: [
      {
        product: String(rowA._id),
        variantSku: skuA,
        title: "Echo Dot (5th Gen) - Smoke",
        image: "",
        priceCents: va.priceCents,
        qty: 1,
      },
      {
        product: String(rowB._id),
        variantSku: skuB,
        title: "Fire TV Stick 4K Max - Smoke",
        image: "",
        priceCents: vb.priceCents,
        qty: 2,
      },
    ],
  } as never);

  const expectedTotalCents = va.priceCents * 1 + vb.priceCents * 2;

  const fixture = {
    stamp,
    skuA,
    skuB,
    ownerId: owner.id,
    ownerToken: owner.token,
    otherId: other.id,
    otherToken: other.token,
    orderKey: `smoke-order-${stamp}-ok`,
    expectedTotalCents,
    origSkuA: va.stock,
    origSkuB: vb.stock,
    address: {
      fullName: "Order Smoke",
      line1: "456 Demo Ave",
      line2: "Suite 10",
      city: "Austin",
      state: "TX",
      zip: "73301",
      phone: "512-555-0199",
    },
    payment: { brand: "Visa", last4: "1111" },
  };
  console.log(JSON.stringify(fixture));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});