import { Suspense } from "react";
import type { Metadata } from "next";
import SchoolCatalogPage from "@/components/SchoolCatalogPage";

export const metadata: Metadata = {
  title: "My Grad Path | 全球院校库",
};

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] dark:bg-zinc-950" />}>
      <SchoolCatalogPage />
    </Suspense>
  );
}
