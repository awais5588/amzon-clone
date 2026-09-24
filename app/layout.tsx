import type { Metadata } from "next";
import "./globals.css";
import { GlobalNav } from "@/components/GlobalNav";
import { Footer } from "@/components/Footer";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: {
    default: "amazon clone",
    template: "%s | amazon clone",
  },
  description:
    "A clone of the modern Amazon.com shopping experience built with Next.js and MongoDB.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-full flex flex-col bg-pagebg text-headline">
        <GlobalNav user={user ? { name: user.name } : null} />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}