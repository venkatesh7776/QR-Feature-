import type { Metadata } from "next";
import { CoupleLogin } from "@/features/memories/components/CoupleLogin";

export const metadata: Metadata = { title: "Wedding Memories · Passcode" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <CoupleLogin next={next} />;
}
