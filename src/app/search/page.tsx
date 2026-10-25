import type { Metadata } from "next";
import { SearchViewClient } from "@/components/search-view-client";
import { searchPublicContent } from "@/lib/search-public";
import type { ContentFormat } from "@/lib/movies";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const hasFilters = Boolean(q || params.format || params.category || params.year || params.sort);

  return {
    title: q ? `نتائج البحث عن "${q}" | كارتوني` : "البحث والاستكشاف | كارتوني",
    description: "ابحث في مكتبة كارتوني الشاملة للأفلام والمسلسلات الكرتونية بالعربية والإنجليزية مع فلاتر دقيقة.",
    alternates: { canonical: "/search" },
    robots: hasFilters ? { index: false, follow: true } : { index: true, follow: true },
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
  const format =
    params.format === "movie" || params.format === "series"
      ? (params.format as ContentFormat)
      : "all";
  const category = typeof params.category === "string" ? params.category : "all";
  const year = typeof params.year === "string" ? params.year : "all";
  const ageRating =
    typeof params.ageRating === "string"
      ? params.ageRating
      : typeof params.age === "string"
      ? params.age
      : "all";
  const minRating = Number(params.minRating || params.rating || 0);
  const sortBy = (
    typeof params.sortBy === "string"
      ? params.sortBy
      : typeof params.sort === "string"
      ? params.sort
      : "relevance"
  ) as any;
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const searchRes = await searchPublicContent({
    query,
    format,
    category,
    year,
    ageRating,
    minRating,
    sortBy,
    page,
    pageSize: 16,
  });

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <SearchViewClient
        initialItems={searchRes.items}
        totalCount={searchRes.totalCount}
        totalPages={searchRes.totalPages}
        currentPage={searchRes.currentPage}
        availableYears={searchRes.availableYears}
        availableAgeRatings={searchRes.availableAgeRatings}
        initialQuery={query}
        initialFormat={format}
        initialCategory={category}
        initialYear={year}
        initialAgeRating={ageRating}
        initialMinRating={minRating}
        initialSortBy={sortBy}
        error={searchRes.error}
      />
    </main>
  );
}
