import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/app/_actions/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your Account" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="max-w-[1000px] mx-auto px-3 py-8">
      <h1 className="text-3xl font-semibold text-headline">Your Account</h1>

      <div className="mt-4 bg-card rounded-sm shadow-sm p-5">
        <p className="text-lg text-headline">Hello, {user.name}</p>
        <p className="text-[13px] text-muted">{user.email}</p>
      </div>

      <section id="orders" className="mt-4 bg-card rounded-sm shadow-sm p-5">
        <h2 className="text-lg font-medium text-headline">Your Orders</h2>
        <p className="mt-1 text-[13px] text-muted">
          Track, return, or view order details.
        </p>
        <Link
          href="/orders"
          className="inline-block mt-3 bg-white hover:bg-row-hover border border-border text-headline rounded-sm px-4 py-1.5 text-[13px] font-medium shadow-sm"
        >
          View your orders
        </Link>
      </section>

      <div className="mt-4 bg-card rounded-sm shadow-sm p-5">
        <h2 className="text-lg font-medium text-headline">Sign out</h2>
        <p className="mt-1 text-[13px] text-muted mb-3">
          Signing out keeps your session on this device.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="bg-cta hover:bg-[#e6c200] border border-cta-border text-headline rounded-sm px-4 py-1.5 text-[13px] font-medium shadow-sm cursor-pointer"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}