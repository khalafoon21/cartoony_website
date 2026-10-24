import "server-only";

import type {
  ArtTheme,
  CategorySlug,
  ContentFormat,
  HomepageSectionConfig,
  Movie,
} from "./movies";
import type { DbMovieCategoryJoin, DbMovieRow } from "./movies-admin";
import { isSampleContent } from "./sample-content";
import { executePublicRead } from "./supabase-server";

type DbSeriesRow = Omit<DbMovieRow, "duration_minutes" | "duration_label_ar" | "movie_categories"> & {
  series_categories?: DbMovieCategoryJoin[];
};

type PublicResult = { ok: boolean; error?: string; movies: Movie[] };

const VALID_CATEGORY_SLUGS = new Set<CategorySlug>([
  "movies", "action", "adventure", "comedy", "family", "fantasy", "anime",
]);
const VALID_THEMES = new Set<ArtTheme>(["forest", "space", "ocean", "desert", "sky"]);
const PUBLIC_ERROR = "تعذر تحميل بعض الحكايات الآن. يرجى المحاولة مرة أخرى بعد قليل.";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function mapContent(row: DbMovieRow | DbSeriesRow, format: ContentFormat): Movie {
  const joins = "series_categories" in row ? row.series_categories :
    "movie_categories" in row ? row.movie_categories : [];
  const sortedJoins = [...(joins ?? [])].sort((a, b) =>
    a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1
  );
  const categorySlugs: CategorySlug[] = [];
  const categoryLabels: string[] = [];

  for (const join of sortedJoins) {
    const slug = join.categories?.slug as CategorySlug | undefined;
    if (slug && VALID_CATEGORY_SLUGS.has(slug) && !categorySlugs.includes(slug)) {
      categorySlugs.push(slug);
      categoryLabels.push(join.categories!.title_ar);
    }
  }

  let duration = "";
  if ("duration_minutes" in row) {
    const hours = Math.floor(row.duration_minutes / 60);
    const minutes = row.duration_minutes % 60;
    duration = row.duration_label_ar || [
      hours ? `${hours} ساعة` : "", minutes ? `${minutes} دقيقة` : "",
    ].filter(Boolean).join(" و");
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title_ar,
    subtitle: row.subtitle_ar || "",
    franchise: row.franchise_ar || row.title_ar,
    englishTitle: row.title_original,
    description: row.description_ar,
    category: categorySlugs[0] ?? (format === "movie" ? "movies" : "all"),
    categoryLabel: categoryLabels[0] ?? (format === "movie" ? "أفلام" : "مسلسلات"),
    categories: categorySlugs,
    categoryLabels,
    posterUrl: row.poster_url,
    backdropUrl: row.backdrop_url,
    ageRating: row.age_rating || undefined,
    year: row.release_year,
    duration,
    rating: Number(row.rating).toFixed(1),
    theme: VALID_THEMES.has(row.theme as ArtTheme) ? row.theme as ArtTheme : "forest",
    accent: row.accent_color || "#F5A623",
    audioBadge: row.audio_badge === "subtitled" ? "مترجم" : "مدبلج",
    format,
    featured: Boolean(row.is_featured),
    mostWatched: Boolean(row.is_most_watched),
    recentlyAdded: Boolean(row.is_recently_added),
  };
}

export function mapDbMovieToPublicMovie(row: DbMovieRow): Movie {
  return mapContent(row, "movie");
}

function contentQuery(format: ContentFormat): string {
  const join = format === "movie" ? "movie_categories" : "series_categories";
  return `?select=*,${join}(category_id,is_primary,categories(id,slug,title_ar))&status=eq.published&order=created_at.desc`;
}

async function getPublishedContent(format: ContentFormat): Promise<PublicResult> {
  const result = await executePublicRead<Array<DbMovieRow | DbSeriesRow>>(
    format === "movie" ? "movies" : "series", contentQuery(format)
  );
  if (!result.ok) return { ok: false, error: PUBLIC_ERROR, movies: [] };
  return {
    ok: true,
    movies: result.data
      .filter((row) => row.status === "published" && !isSampleContent(row))
      .map((row) => mapContent(row, format)),
  };
}

export function getPublicPublishedMovies(): Promise<PublicResult> {
  return getPublishedContent("movie");
}

export function getPublicPublishedSeries(): Promise<PublicResult> {
  return getPublishedContent("series");
}

export async function getPublicPublishedCatalog(): Promise<PublicResult> {
  const [movies, series] = await Promise.all([
    getPublicPublishedMovies(), getPublicPublishedSeries(),
  ]);
  return {
    ok: movies.ok && series.ok,
    error: movies.error || series.error,
    movies: [...movies.movies, ...series.movies],
  };
}

/** Reads only the selected table, so movie and series slugs cannot collide. */
export async function getPublicContentBySlug(slug: string, format: ContentFormat = "movie"): Promise<{
  ok: boolean; error?: string; item: Movie | null; related: Movie[];
}> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(cleanSlug)) return { ok: true, item: null, related: [] };

  const [single, catalog] = await Promise.all([
    executePublicRead<Array<DbMovieRow | DbSeriesRow>>(
      format === "movie" ? "movies" : "series",
      `${contentQuery(format)}&slug=eq.${encodeURIComponent(cleanSlug)}&limit=1`
    ),
    getPublicPublishedCatalog(),
  ]);
  if (!single.ok) return { ok: false, error: PUBLIC_ERROR, item: null, related: [] };
  const row = single.data.find((entry) => entry.status === "published" && !isSampleContent(entry));
  if (!row) return { ok: true, item: null, related: [] };
  const item = mapContent(row, format);
  const related = catalog.movies
    .filter((other) => other.format !== item.format || other.id !== item.id)
    .slice(0, 6);
  return { ok: true, item, related };
}

export async function getPublicHomepageSections(): Promise<{
  ok: boolean; error?: string; heroSlides: Movie[]; sections: HomepageSectionConfig[];
}> {
  const catalog = await getPublicPublishedCatalog();
  const featured = catalog.movies.filter((item) => item.featured);
  const sections: HomepageSectionConfig[] = [
    {
      id: "most-watched", eyebrow: "الأكثر شعبية الآن", title: "الأكثر مشاهدة",
      subtitle: "مختارات من مكتبة كارتوني", items: catalog.movies.filter((item) => item.mostWatched),
    },
    {
      id: "recently-added", eyebrow: "جديد مكتبة كارتوني", title: "أُضيف حديثاً",
      subtitle: "حكايات جديدة في المكتبة", items: catalog.movies.filter((item) => item.recentlyAdded),
    },
    {
      id: "cartoon-movies", eyebrow: "سهرات سينمائية", title: "أفلام كرتون",
      subtitle: "أفلام رسوم متحركة لكل العائلة", items: catalog.movies.filter((item) => item.format === "movie"),
    },
    {
      id: "cartoon-series", eyebrow: "حكايات متتابعة", title: "مسلسلات كرتون",
      subtitle: "اكتشف مسلسلات مكتبة كارتوني", items: catalog.movies.filter((item) => item.format === "series"),
    },
  ];
  return {
    ok: catalog.ok, error: catalog.error,
    heroSlides: (featured.length ? featured : catalog.movies).slice(0, 5),
    sections: sections.filter((section) => section.items.length > 0),
  };
}
