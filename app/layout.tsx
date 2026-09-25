import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";
import { GlobalNav } from "@/components/GlobalNav";
import { Footer } from "@/components/Footer";
import { getSessionUser } from "@/lib/auth/session";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-morrow-sans",
});

const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-morrow-display",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: `${BRAND.descriptor}. A database-backed storefront built with Next.js and MongoDB.`,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getSessionUser();
  return (
    <html lang="en" className={`${manrope.variable} ${display.variable}`}>
      <body className="min-h-full flex flex-col bg-pagebg text-headline antialiased">
        <GlobalNav user={user ? { name: user.name } : null} />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
