import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/app/_actions/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="morrow-container min-h-screen py-8 sm:py-12">
      <header className="border-b border-border pb-7"><p className="morrow-eyebrow">Your Morrow</p><h1 className="mt-2 font-display text-4xl text-headline sm:text-5xl">Your account</h1><p className="mt-3 text-sm text-text-secondary">A quiet place to keep your orders and preferences close.</p></header>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="morrow-panel p-6"><p className="morrow-eyebrow">Profile</p><p className="mt-3 text-xl font-bold text-headline">Hello, {user.name}</p><p className="mt-1 text-sm text-text-secondary">{user.email}</p><Link href="/orders" className="morrow-link mt-6 inline-flex text-sm">View your orders <span aria-hidden="true">↗</span></Link></section>
        <section className="morrow-panel p-6"><p className="morrow-eyebrow">Session</p><h2 className="mt-3 text-xl font-bold text-headline">Ready to step away?</h2><p className="mt-2 text-sm leading-relaxed text-text-secondary">Sign out on this device when you&apos;re finished browsing.</p><form action={signOut} className="mt-6"><button type="submit" className="morrow-button-secondary">Sign out</button></form></section>
      </div>
    </div>
  );
}
