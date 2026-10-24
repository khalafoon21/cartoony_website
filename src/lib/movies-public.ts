import "server-only";

import {
  allMovies,
  type ArtTheme,
  type CategorySlug,
  type HomepageSectionConfig,
  type Movie,
} from "./movies";
import { formatArabicDuration, type DbMovieRow } from "./movies-admin";
import { executePublicRead } from "./supabase-server";

const VALID_CATEGORY_SLUGS = new Set<CategorySlug>([
  "movies",
  "action",
  "adventure",
  "comedy",
  "family",
  "fantasy",
  "anime",
]);

const VALID_THEMES = new Set<ArtTheme>([
  "forest",
  "space",
  "ocean",
  "desert",
  "sky",
]);

export function mapDbMovieToPublicMovie(row: DbMovieRow): Movie {
  const sortedJoins = [...(row.movie_categories ?? [])].sort((a, b) =>
    a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1
  );

  const categorySlugs: CategorySlug[] = [];
  const categoryLabels: string[] = [];

  for (const join of sortedJoins) {
    const slug = join.categories?.slug as CategorySlug | undefined;
    const titleAr = join.categories?.title_ar;
    if (slug && VALID_CATEGORY_SLUGS.has(slug) && !categorySlugs.includes(slug)) {
      categorySlugs.push(slug);
    }
    if (titleAr && !categoryLabels.includes(titleAr)) {
      categoryLabels.push(titleAr);
    }
  }

  const primarySlug: CategorySlug = categorySlugs[0] ?? "movies";
  const primaryLabel: string = categoryLabels[0] ?? "أفلام";

  const theme: ArtTheme = VALID_THEMES.has(row.theme as ArtTheme)
    ? (row.theme as ArtTheme)
    : "forest";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title_ar,
    subtitle: row.subtitle_ar || "",
    franchise: row.franchise_ar || row.title_ar,
    englishTitle: row.title_original,
    description: row.description_ar,
    category: primarySlug,
    categoryLabel: primaryLabel,
    categories: categorySlugs.length > 0 ? categorySlugs : ["movies"],
    categoryLabels: categoryLabels.length > 0 ? categoryLabels : ["أفلام"],
    posterUrl: row.poster_url,
    backdropUrl: row.backdrop_url,
    ageRating: row.age_rating || "6+",
    year: row.release_year,
    duration: row.duration_label_ar || formatArabicDuration(row.duration_minutes) || `${row.duration_minutes} دقيقة`,
    rating: Number(row.rating).toFixed(1),
    theme,
    accent: row.accent_color || "#F5A623",
    audioBadge: row.audio_badge === "subtitled" ? "مترجم" : "مدبلج",
    format: "movie",
    featured: Boolean(row.is_featured),
    mostWatched: Boolean(row.is_most_watched),
    recentlyAdded: Boolean(row.is_recently_added),
  };
}

/**
 * Fetches published movies from Supabase using the least-privilege public key.
 * Explicitly excludes drafts and archived records.
 */
export async function getPublicPublishedMovies(): Promise<{
  ok: boolean;
  error?: string;
  movies: Movie[];
}> {
  const res = await executePublicRead<DbMovieRow[]>(
    "movies",
    "?select=*,movie_categories(category_id,is_primary,categories(id,slug,title_ar))&status=eq.published&order=created_at.desc"
  );

  if (!res.ok) {
    return { ok: false, error: res.error, movies: [] };
  }

  const publishedOnly = res.data
    .filter((row) => row.status === "published")
    .map(mapDbMovieToPublicMovie);

  return { ok: true, movies: publishedOnly };
}

/**
 * Fetches a single published movie by slug from Supabase (or unchanged series by slug).
 * Draft/unpublished movies are strictly excluded and return `null`.
 */
export async function getPublicContentBySlug(slug: string): Promise<{
  ok: boolean;
  error?: string;
  item: Movie | null;
  related: Movie[];
}> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) {
    return { ok: true, item: null, related: [] };
  }

  const [singleRes, allPubRes] = await Promise.all([
    executePublicRead<DbMovieRow[]>(
      "movies",
      `?select=*,movie_categories(category_id,is_primary,categories(id,slug,title_ar))&slug=eq.${encodeURIComponent(cleanSlug)}&status=eq.published&limit=1`
    ),
    getPublicPublishedMovies(),
  ]);

  const seriesItems = allMovies.filter((m) => m.format === "series");

  if (!singleRes.ok) {
    return { ok: false, error: singleRes.error, item: null, related: [] };
  }

  const matchedDbRow = singleRes.data.find((r) => r.status === "published");
  if (matchedDbRow) {
    const movie = mapDbMovieToPublicMovie(matchedDbRow);
    const otherPublishedMovies = allPubRes.movies.filter((m) => m.id !== movie.id);
    const related = [...otherPublishedMovies, ...seriesItems].slice(0, 6);
    return { ok: true, item: movie, related };
  }

  // Keep series data unchanged for now (only match format === "series")
  const matchedSeries = seriesItems.find((s) => s.slug === cleanSlug) ?? null;
  if (matchedSeries) {
    const related = [
      ...allPubRes.movies,
      ...seriesItems.filter((s) => s.id !== matchedSeries.id),
    ].slice(0, 6);
    return { ok: true, item: matchedSeries, related };
  }

  return { ok: true, item: null, related: [] };
}

/**
 * Builds homepage sections combining real published movies from Supabase
 * with the unchanged series catalog.
 */
export async function getPublicHomepageSections(): Promise<{
  ok: boolean;
  error?: string;
  publishedMovies: Movie[];
  sections: HomepageSectionConfig[];
}> {
  const pubRes = await getPublicPublishedMovies();
  const publishedMovies = pubRes.movies;
  const seriesItems = allMovies.filter((m) => m.format === "series");

  const mostWatchedMovies = publishedMovies.filter((m) => m.mostWatched);
  const recentlyAddedMovies = publishedMovies.filter((m) => m.recentlyAdded);

  // Ensure newly published movies appear in Most Watched / Recently Added if none explicitly flagged yet
  const effectiveMostWatchedMovies =
    mostWatchedMovies.length > 0 ? mostWatchedMovies : publishedMovies;
  const effectiveRecentlyAddedMovies =
    recentlyAddedMovies.length > 0 ? recentlyAddedMovies : publishedMovies;

  const sections: HomepageSectionConfig[] = [
    {
      id: "most-watched",
      eyebrow: "الأكثر شعبية الآن",
      title: "الأكثر مشاهدة",
      subtitle: "الحكايات التي أحبّها الجمهور هذا الأسبوع",
      items: [
        ...effectiveMostWatchedMovies,
        ...seriesItems.filter((s) => s.mostWatched),
      ],
    },
    {
      id: "recently-added",
      eyebrow: "جديد مكتبة كارتوني",
      title: "أُضيف حديثاً",
      subtitle: "أحدث الإصدارات والمغامرات الحصرية",
      items: [
        ...effectiveRecentlyAddedMovies,
        ...seriesItems.filter((s) => s.recentlyAdded),
      ],
    },
    {
      id: "cartoon-movies",
      eyebrow: "سهرات سينمائية",
      title: "أفلام كرتون",
      subtitle: "أفلام رسوم متحركة كاملة من قاعدة بيانات كارتوني",
      items: publishedMovies,
    },
    {
      id: "cartoon-series",
      eyebrow: "حلقات متجددة",
      title: "مسلسلات كرتون",
      subtitle: "مواسم شيّقة ومغامرات متتابعة",
      items: seriesItems,
    },
  ];

  return {
    ok: pubRes.ok,
    error: pubRes.error,
    publishedMovies,
    sections,
  };
}
