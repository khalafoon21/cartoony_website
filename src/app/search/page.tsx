import type { Metadata } from "next";
import { SearchViewClient } from "@/components/search-view-client";
import { getPublicPublishedCatalog } from "@/lib/movies-public";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const hasFilters = Boolean(q || params.format || params.filter);

  return {
    title: q ? `نتائج البحث عن "${q}" | كارتوني` : "البحث والاستكشاف | كارتوني",
    description:
      "ابحث فوراً في مكتبة كارتوني للأفلام والمسلسلات الكرتونية بالعربية والإنجليزية.",
    alternates: { canonical: "/search" },
    robots: hasFilters
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: q ? `نتائج البحث عن "${q}" في كارتوني` : "البحث الذكي في كارتوني",
      description: "ابحث عن أعمالك الكرتونية المفضلة.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: q ? `نتائج البحث عن "${q}" في كارتوني` : "البحث الذكي في كارتوني",
      description: "ابحث عن أعمالك الكرتونية المفضلة.",
    },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const query = typeof params.q === "string" ? params.q : "";
  const rawFilter =
    typeof params.filter === "string"
      ? params.filter
      : typeof params.format === "string"
      ? params.format
      : "all";

  const catalogRes = await getPublicPublishedCatalog();

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <SearchViewClient
        allItems={catalogRes.movies}
        initialQuery={query}
        initialFilter={rawFilter}
        error={catalogRes.error}
      />
    </main>
  );
}
