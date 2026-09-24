import { readFileSync } from "node:fs";
import { connectDB } from "@/lib/mongoose";
import { ProductModel } from "@/lib/models";

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("usage: restore-fixture-stock.ts <fixture.json>");
  const fix = JSON.parse(readFileSync(path, "utf8"));
  await connectDB();
  await ProductModel.updateOne(
    { variants: { $elemMatch: { sku: fix.skuA } } },
    { $set: { "variants.$.stock": fix.origSkuA } }
  );
  await ProductModel.updateOne(
    { variants: { $elemMatch: { sku: fix.skuB } } },
    { $set: { "variants.$.stock": fix.origSkuB } }
  );
  console.log("stock restored for smoke fixture");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});