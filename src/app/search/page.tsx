import type { Metadata } from "next";
import { SearchViewClient } from "@/components/search-view-client";
import { getPublicPublishedCatalog } from "@/lib/movies-public";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  return pageMetadata({
    title: q ? `نتائج البحث عن «${q.slice(0, 80)}»` : "البحث والاستكشاف",
    description:
      "ابحث فوراً في مكتبة كارتوني للأفلام والمسلسلات الكرتونية بالعربية والإنجليزية.",
    path: "/search",
    index: false,
  });
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
