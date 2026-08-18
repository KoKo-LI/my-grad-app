import { notFound } from "next/navigation";
import SavedTargetSchoolsPage from "@/components/SavedTargetSchoolsPage";
import type { SchoolItem } from "@/types";

const tierBySlug: Record<string, SchoolItem["status"]> = {
  reach: "Reach",
  safety: "Safety",
  target: "Target",
};

export function generateStaticParams() {
  return Object.keys(tierBySlug).map((tier) => ({ tier }));
}

export default async function TargetSchoolTierPage({ params }: { params: Promise<{ tier: string }> }) {
  const { tier } = await params;
  const targetTier = tierBySlug[tier];

  if (!targetTier) notFound();

  return <SavedTargetSchoolsPage tier={targetTier} />;
}
