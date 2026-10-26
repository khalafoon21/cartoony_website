import "server-only";

import type {
  ArtTheme,
  CategorySlug,
  ContentFormat,
  HomepageSectionConfig,
  HomepageSectionSetting,
  Movie,
  VideoServer,
} from "./movies";
import { isVideoEmbedUrl } from "./video-helpers";

export type { HomepageSectionSetting };
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

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionSetting[] = [
  {
    id: "editors-picks",
    title: "مختارات كارتوني",
    eyebrow: "توصيات خاصة",
    subtitle: "حكايات مختارة بعناية ننصح بمشاهدتها",
    enabled: true,
    order: 1,
  },
  {
    id: "recently-added",
    title: "أُضيف حديثاً",
    eyebrow: "جديد مكتبة كارتوني",
    subtitle: "أحدث الأعمال المنشورة في كارتوني",
    enabled: true,
    order: 2,
  },
  {
    id: "cartoon-movies",
    title: "أفلام كرتون",
    eyebrow: "سهرات سينمائية",
    subtitle: "أفلام رسوم متحركة كاملة من قاعدة بيانات كارتوني",
    enabled: true,
    order: 3,
  },
  {
    id: "cartoon-series",
    title: "مسلسلات كرتون",
    eyebrow: "حلقات متسلسلة",
    subtitle: "مواسم شيّقة ومغامرات متتابعة",
    enabled: true,
    order: 4,
  },
  {
    id: "most-watched",
    title: "الأكثر شعبية",
    eyebrow: "الأكثر شعبية الآن",
    subtitle: "الأعمال المفضلة لدى متابعي كارتوني",
    enabled: true,
    order: 5,
  },
];

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
    videoUrl: typeof (row as { metadata?: { video_url?: string } }).metadata?.video_url === "string"
      ? (row as { metadata?: { video_url?: string } }).metadata!.video_url
      : undefined,
    videoType: ((row as any).metadata?.video_type === "iframe" || (row as any).metadata?.video_type === "direct")
      ? (row as any).metadata.video_type
      : typeof (row as any).metadata?.video_url === "string" && isVideoEmbedUrl((row as any).metadata.video_url)
      ? "iframe"
      : undefined,
    servers: Array.isArray((row as any).metadata?.servers)
      ? ((row as any).metadata.servers as VideoServer[])
      : undefined,
    subtitleUrl: typeof (row as { metadata?: { subtitle_url?: string } }).metadata?.subtitle_url === "string"
      ? (row as { metadata?: { subtitle_url?: string } }).metadata!.subtitle_url
      : undefined,
    subtitleLang: typeof (row as { metadata?: { subtitle_lang?: string } }).metadata?.subtitle_lang === "string"
      ? (row as { metadata?: { subtitle_lang?: string } }).metadata!.subtitle_lang
      : undefined,
    metadata: (row as any).metadata,
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

export type PublicEpisode = {
  id: string;
  episodeNumber: number;
  slug: string;
  title: string;
  originalTitle: string;
  description: string;
  stillUrl: string | null;
  durationMinutes: number;
  durationLabel: string;
  audioBadge: string;
  videoUrl?: string;
  videoType?: "direct" | "iframe";
  servers?: VideoServer[];
  subtitleUrl?: string;
  subtitleLang?: string;
};

export type PublicSeason = {
  id: string;
  seasonNumber: number;
  slug: string;
  title: string;
  originalTitle: string;
  description: string;
  posterUrl: string | null;
  releaseYear: number | null;
  episodes: PublicEpisode[];
};

type DbSeasonJoin = {
  id: string;
  series_id: string;
  season_number: number;
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar: string;
  poster_url: string | null;
  release_year: number | null;
  status: string;
  episodes?: Array<{
    id: string;
    episode_number: number;
    slug: string;
    title_ar: string;
    title_original: string;
    description_ar: string;
    still_url: string | null;
    duration_minutes: number;
    audio_badge: string;
    metadata?: { video_url?: string; subtitle_url?: string; subtitle_lang?: string };
    status: string;
  }>;
};

function mapPublicSeasons(rawSeasons?: DbSeasonJoin[]): PublicSeason[] {
  return (rawSeasons ?? [])
    .filter((s) => s.status === "published")
    .sort((a, b) => a.season_number - b.season_number)
    .map((s) => {
      const episodes: PublicEpisode[] = (s.episodes ?? [])
        .filter((ep) => ep.status === "published")
        .sort((a, b) => a.episode_number - b.episode_number)
        .map((ep) => {
          const videoUrl =
            typeof ep.metadata?.video_url === "string" ? ep.metadata.video_url : undefined;
          const videoType =
            ((ep.metadata as any)?.video_type === "iframe" || (ep.metadata as any)?.video_type === "direct")
              ? (ep.metadata as any).video_type
              : videoUrl && isVideoEmbedUrl(videoUrl)
              ? "iframe"
              : undefined;
          const servers = Array.isArray((ep.metadata as any)?.servers)
            ? ((ep.metadata as any).servers as VideoServer[])
            : undefined;
          const subtitleUrl =
            typeof ep.metadata?.subtitle_url === "string" ? ep.metadata.subtitle_url : undefined;
          const subtitleLang =
            typeof ep.metadata?.subtitle_lang === "string" ? ep.metadata.subtitle_lang : undefined;
          return {
            id: ep.id,
            episodeNumber: ep.episode_number,
            slug: ep.slug,
            title: ep.title_ar,
            originalTitle: ep.title_original || "",
            description: ep.description_ar || "",
            stillUrl: ep.still_url,
            durationMinutes: ep.duration_minutes,
            durationLabel: `${ep.duration_minutes} دقيقة`,
            audioBadge: ep.audio_badge === "subtitled" ? "مترجم" : "مدبلج",
            videoUrl,
            videoType,
            servers,
            subtitleUrl,
            subtitleLang,
          };
        });

      return {
        id: s.id,
        seasonNumber: s.season_number,
        slug: s.slug,
        title: s.title_ar,
        originalTitle: s.title_original || "",
        description: s.description_ar || "",
        posterUrl: s.poster_url,
        releaseYear: s.release_year,
        episodes,
      };
    });
}

export async function getPublicSeriesWithDetails(slug: string): Promise<{
  ok: boolean;
  error?: string;
  item: Movie | null;
  seasons: PublicSeason[];
  related: Movie[];
}> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(cleanSlug)) return { ok: true, item: null, seasons: [], related: [] };

  const [seriesRes, catalog] = await Promise.all([
    executePublicRead<
      Array<
        DbSeriesRow & {
          seasons?: DbSeasonJoin[];
        }
      >
    >(
      "series",
      `?select=*,series_categories(category_id,is_primary,categories(id,slug,title_ar)),seasons(*,episodes(*))&status=eq.published&slug=eq.${encodeURIComponent(
        cleanSlug
      )}&limit=1`
    ),
    getPublicPublishedCatalog(),
  ]);

  if (!seriesRes.ok) return { ok: false, error: PUBLIC_ERROR, item: null, seasons: [], related: [] };
  const row = seriesRes.data.find((entry) => entry.status === "published" && !isSampleContent(entry));
  if (!row) return { ok: true, item: null, seasons: [], related: [] };

  const item = mapContent(row, "series");
  const related = catalog.movies
    .filter((other) => other.format !== item.format || other.id !== item.id)
    .slice(0, 6);

  const seasons = mapPublicSeasons(row.seasons);

  return { ok: true, item, seasons, related };
}

export async function getPublicEpisodeWithContext(
  seriesSlug: string,
  episodeSlug: string
): Promise<{
  ok: boolean;
  error?: string;
  series: Movie | null;
  seasons: PublicSeason[];
  currentSeason: PublicSeason | null;
  currentEpisode: PublicEpisode | null;
  previousEpisode: { season: PublicSeason; episode: PublicEpisode } | null;
  nextEpisode: { season: PublicSeason; episode: PublicEpisode } | null;
  related: Movie[];
}> {
  const cleanSeriesSlug = seriesSlug.trim().toLowerCase();
  const cleanEpisodeSlug = episodeSlug.trim().toLowerCase();

  if (!SLUG_PATTERN.test(cleanSeriesSlug) || !SLUG_PATTERN.test(cleanEpisodeSlug)) {
    return {
      ok: true,
      series: null,
      seasons: [],
      currentSeason: null,
      currentEpisode: null,
      previousEpisode: null,
      nextEpisode: null,
      related: [],
    };
  }

  const { ok, error, item, seasons, related } = await getPublicSeriesWithDetails(cleanSeriesSlug);
  if (!ok || !item) {
    return {
      ok,
      error,
      series: null,
      seasons: [],
      currentSeason: null,
      currentEpisode: null,
      previousEpisode: null,
      nextEpisode: null,
      related: [],
    };
  }

  // Flatten all episodes across seasons in canonical order
  const flatEpisodes: Array<{ season: PublicSeason; episode: PublicEpisode }> = [];
  for (const s of seasons) {
    for (const ep of s.episodes) {
      flatEpisodes.push({ season: s, episode: ep });
    }
  }

  const currentIndex = flatEpisodes.findIndex(
    (item) => item.episode.slug === cleanEpisodeSlug
  );

  if (currentIndex === -1) {
    return {
      ok: true,
      series: item,
      seasons,
      currentSeason: null,
      currentEpisode: null,
      previousEpisode: null,
      nextEpisode: null,
      related,
    };
  }

  const currentMatch = flatEpisodes[currentIndex];
  const previousMatch = currentIndex > 0 ? flatEpisodes[currentIndex - 1] : null;
  const nextMatch = currentIndex < flatEpisodes.length - 1 ? flatEpisodes[currentIndex + 1] : null;

  return {
    ok: true,
    series: item,
    seasons,
    currentSeason: currentMatch.season,
    currentEpisode: currentMatch.episode,
    previousEpisode: previousMatch,
    nextEpisode: nextMatch,
    related,
  };
}

export async function getPublicHomepageSections(
  customSectionsConfig?: HomepageSectionSetting[]
): Promise<{
  ok: boolean;
  error?: string;
  heroSlides: Movie[];
  sections: HomepageSectionConfig[];
}> {
  const catalog = await getPublicPublishedCatalog();
  const sectionsConfig = customSectionsConfig ?? DEFAULT_HOMEPAGE_SECTIONS;

  const featured = catalog.movies
    .filter((item) => item.featured && (item.metadata as any)?.hero_enabled !== false)
    .sort((a, b) => {
      const orderA =
        typeof (a.metadata as any)?.hero_order === "number" ? (a.metadata as any).hero_order : 999;
      const orderB =
        typeof (b.metadata as any)?.hero_order === "number" ? (b.metadata as any).hero_order : 999;
      if (orderA !== orderB) return orderA - orderB;
      return (b.year || 0) - (a.year || 0);
    });

  const heroSlides = (featured.length ? featured : catalog.movies).slice(
    0,
    featured.length ? 8 : 5
  );

  const editorsPicks = catalog.movies
    .filter((item) => Boolean((item.metadata as any)?.is_editors_pick))
    .sort((a, b) => {
      const orderA =
        typeof (a.metadata as any)?.editors_pick_order === "number"
          ? (a.metadata as any).editors_pick_order
          : 999;
      const orderB =
        typeof (b.metadata as any)?.editors_pick_order === "number"
          ? (b.metadata as any).editors_pick_order
          : 999;
      return orderA - orderB;
    });

  const sectionItemsMap: Record<string, Movie[]> = {
    "editors-picks": editorsPicks,
    "recently-added": catalog.movies.filter((item) => item.recentlyAdded),
    "cartoon-movies": catalog.movies.filter((item) => item.format === "movie"),
    "cartoon-series": catalog.movies.filter((item) => item.format === "series"),
    "most-watched": catalog.movies.filter((item) => item.mostWatched),
  };

  const sections: HomepageSectionConfig[] = [...sectionsConfig]
    .sort((a, b) => a.order - b.order)
    .filter((sec) => sec.enabled !== false)
    .map((sec) => ({
      id: sec.id,
      eyebrow: sec.eyebrow,
      title: sec.title,
      subtitle: sec.subtitle,
      items: sectionItemsMap[sec.id] || [],
    }))
    .filter((sec) => sec.items.length > 0);

  return {
    ok: catalog.ok,
    error: catalog.error,
    heroSlides,
    sections,
  };
}
