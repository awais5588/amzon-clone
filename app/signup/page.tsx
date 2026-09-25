import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SignUpForm } from "@/components/SignUpForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create Account" };

function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function SignUpPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const { next } = await searchParams;
  return <SignUpForm next={safeNext(next)} />;
}