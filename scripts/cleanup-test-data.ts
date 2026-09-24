/**
 * Data hygiene sweep (P8): removes leftover test users, their carts/orders/sessions,
 * stray guest carts, and orphaned session records from the development database.
 * Run: npx tsx scripts/cleanup-test-data.ts
 */
import "dotenv/config";
import { connectDB } from "../lib/mongoose";
import { CartModel, OrderModel, SessionModel, UserModel } from "../lib/models";

async function main() {
  await connectDB();

  const userEmailRe = /^(auth-test|order-test|smoke-order|cart-test|p\d+-test|qa-test)-/;
  const testUsers = (await UserModel.find({
    $or: [{ email: userEmailRe }, { email: /@example\.com$/ }],
  })
    .select("_id email name")
    .lean()
    .exec()) as unknown as Array<{ _id: unknown; email: string; name: string }>;

  const ids = testUsers
    .filter((u) => u.email.startsWith("auth-test-") || u.email.startsWith("order-test-") || u.email.startsWith("smoke-order-") || u.email.startsWith("cart-test-") || /^p\d+-test-/.test(u.email))
    .map((u) => String(u._id));

  const ordersBefore = await OrderModel.countDocuments({ user: { $in: ids } });
  const cartsBefore = await CartModel.countDocuments({
    $or: [{ userId: { $in: ids.map((id) => `user:${id}`) } }, { userId: "user:501" }],
  });
  const sessionsBefore = await SessionModel.countDocuments({ userId: { $in: ids } });

  if (ids.length > 0) {
    await OrderModel.deleteMany({ user: { $in: ids } });
    await CartModel.deleteMany({ userId: { $in: ids.map((id) => `user:${id}`) } });
    await SessionModel.deleteMany({ userId: { $in: ids } });
    await UserModel.deleteMany({ _id: { $in: ids } });
  }
  await CartModel.deleteOne({ userId: "user:501" });
  await CartModel.deleteMany({ userId: { $regex: /^guest:guest-test-/ } });

  const allUserIds = (await UserModel.find({}).select("_id").lean().exec()) as unknown as Array<{ _id: unknown }>;
  const idSet = new Set(allUserIds.map((u) => String(u._id)));
  const orphanSessions = await SessionModel.find({}).select("userId").lean().exec() as unknown as Array<{ userId: string }>;
  const orphanIds = orphanSessions.filter((s) => !idSet.has(String(s.userId))).length;
  if (orphanIds > 0) {
    const allSessions = (await SessionModel.find({}).lean().exec()) as unknown as Array<{ _id: unknown; userId: string }>;
    await SessionModel.deleteMany({ _id: { $in: allSessions.filter((s) => !idSet.has(String(s.userId))).map((s) => s._id) } });
  }

  console.log(`cleanup: removed ${ids.length} test users, ${ordersBefore} orders, ${cartsBefore} carts, ${sessionsBefore} sessions, ${orphanIds} orphaned sessions`);
  process.exit(0);
}

main().catch((err) => {
  console.error("cleanup error:", err);
  process.exit(1);
});