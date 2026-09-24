import { connectDB } from "../lib/mongoose";
import { UserModel } from "../lib/models";
import { createSessionRecord } from "../lib/auth/session-core";
import { hashPassword } from "../lib/auth/password";

const email = process.env.SMOKE_EMAIL ?? "smoke@example.com";
const password = process.env.SMOKE_PASS ?? "secret9";
const name = process.env.SMOKE_NAME ?? "Smoke Tester";

(async () => {
  await connectDB();
  await UserModel.deleteMany({ email });
  const user = await UserModel.create({
    name,
    email,
    passwordHash: await hashPassword(password),
  } as never);
  const token = await createSessionRecord(String(user._id));
  console.log(JSON.stringify({ userId: String(user._id), token }));
  process.exit(0);
})();