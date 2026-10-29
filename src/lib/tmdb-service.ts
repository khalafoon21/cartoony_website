import "server-only";

import { getAdminSession } from "./admin-auth";
import { executeAdminRead, executeAdminWrite } from "./supabase-server";
import type { ArtThemeType, AudioBadgeType, PublicationStatus } from "./movies-admin";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbArtworkOption = {
  url: string;
  originalUrl: string;
  width: number;
  height: number;
};

export type TmdbSearchResult = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  title_ar: string;
  title_original: string;
  overview: string;
  release_year: number;
  poster_url: string | null;
  backdrop_url: string | null;
  vote_average: number;
  existingInDb?: boolean;
  existingSlug?: string;
  existingId?: string;
};

export type TmdbMoviePreview = {
  tmdb_id: number;
  title_ar: string;
  title_original: string;
  subtitle_ar: string;
  franchise_ar: string;
  slug: string;
  overview_ar: string;
  overview_en: string;
  release_year: number;
  runtime_minutes: number;
  duration_label_ar: string;
  rating: number;
  age_rating: string;
  audio_badge: AudioBadgeType;
  theme: ArtThemeType;
  accent_color: string;
  poster_url: string | null;
  backdrop_url: string | null;
  available_posters: TmdbArtworkOption[];
  available_backdrops: TmdbArtworkOption[];
  category_ids: string[];
  existing_record: {
    id: string;
    slug: string;
    title_ar: string;
    video_url?: string;
  } | null;
};

export type TmdbEpisodePreview = {
  tmdb_id: number;
  season_number: number;
  episode_number: number;
  title_ar: string;
  title_original: string;
  overview_ar: string;
  duration_minutes: number;
  still_url: string | null;
  air_date: string | null;
  already_in_db: boolean;
  existing_id?: string;
  selected: boolean;
};

export type TmdbSeasonPreview = {
  tmdb_id: number;
  season_number: number;
  name_ar: string;
  name_original: string;
  overview_ar: string;
  poster_url: string | null;
  air_date: string | null;
  episode_count: number;
  episodes: TmdbEpisodePreview[];
  already_in_db: boolean;
  existing_id?: string;
  selected: boolean;
};

export type TmdbSeriesPreview = {
  tmdb_id: number;
  title_ar: string;
  title_original: string;
  subtitle_ar: string;
  franchise_ar: string;
  slug: string;
  overview_ar: string;
  overview_en: string;
  release_year: number;
  rating: number;
  age_rating: string;
  audio_badge: AudioBadgeType;
  theme: ArtThemeType;
  accent_color: string;
  poster_url: string | null;
  backdrop_url: string | null;
  available_posters: TmdbArtworkOption[];
  available_backdrops: TmdbArtworkOption[];
  category_ids: string[];
  seasons: TmdbSeasonPreview[];
  existing_record: {
    id: string;
    slug: string;
    title_ar: string;
  } | null;
};

function getTmdbKey(): string {
  const envKey = process.env.TMDB_API_KEY?.trim() || process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  // Safe default fallback for verified production/development use
  return envKey || "8265bd1679663a7ea12ac168da84d2e8";
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}, retries = 2): Promise<T | null> {
  const key = getTmdbKey();
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      if (res.status === 429 && attempt < retries) {
        // Rate limit hit: exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      if (res.status >= 500 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }

      return null;
    } catch {
      if (attempt === retries) return null;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  return null;
}

function formatDurationLabel(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} ساعة و${m} دقيقة`;
  if (h > 0) return `${h} ساعة`;
  return `${m} دقيقة`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Map TMDB genre IDs to existing Cartoony category slugs
function mapGenresToCartoonyCategorySlugs(
  genreIds: number[],
  originCountry: string[] = [],
  originalLanguage = ""
): string[] {
  const slugs = new Set<string>();

  // Check anime
  const isJapanese =
    originCountry.includes("JP") ||
    originalLanguage.toLowerCase() === "ja";

  if (isJapanese && genreIds.includes(16)) {
    slugs.add("anime");
  }

  for (const gid of genreIds) {
    switch (gid) {
      case 28: // Action
      case 10759: // Action & Adventure (TV)
        slugs.add("action");
        slugs.add("adventure");
        break;
      case 12: // Adventure
        slugs.add("adventure");
        break;
      case 16: // Animation
        if (!isJapanese) {
          slugs.add("movies");
          slugs.add("family");
        }
        break;
      case 35: // Comedy
        slugs.add("comedy");
        break;
      case 10751: // Family
        slugs.add("family");
        break;
      case 14: // Fantasy
      case 10765: // Sci-Fi & Fantasy (TV)
      case 878: // Sci-Fi
        slugs.add("fantasy");
        break;
      case 9648: // Mystery
        slugs.add("adventure");
        break;
      case 18: // Drama
        slugs.add("movies");
        break;
    }
  }

  if (slugs.size === 0) {
    slugs.add("movies");
  }

  return Array.from(slugs);
}

// Get Cartoony category IDs from slugs
async function getCategoryIdsFromSlugs(slugs: string[]): Promise<string[]> {
  const res = await executeAdminRead<Array<{ id: string; slug: string }>>(
    "categories",
    `?select=id,slug&status=eq.published`
  );
  if (!res.ok || !res.data) return [];
  const map = new Map(res.data.map((c) => [c.slug, c.id]));
  const ids: string[] = [];
  for (const s of slugs) {
    const id = map.get(s);
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Searches TMDB for movies or TV series with Arabic preference and English fallback.
 */
export async function searchTmdb(
  query: string,
  mediaType: "movie" | "tv" | "multi" = "multi",
  page = 1
): Promise<{ ok: boolean; results: TmdbSearchResult[]; total_results: number; error?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, results: [], total_results: 0, error: "غير مصرح: يلزم تسجيل دخول المشرف." };
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { ok: true, results: [], total_results: 0 };
  }

  const endpoint =
    mediaType === "movie"
      ? "/search/movie"
      : mediaType === "tv"
      ? "/search/tv"
      : "/search/multi";

  // 1. Fetch Arabic search results
  const arData = await tmdbFetch<{
    page: number;
    results: any[];
    total_results: number;
    total_pages: number;
  }>(endpoint, { query: cleanQuery, language: "ar-SA", page: String(page) });

  // 2. Fetch English search results to fallback for missing titles/overviews
  const enData = await tmdbFetch<{
    results: any[];
  }>(endpoint, { query: cleanQuery, language: "en-US", page: String(page) });

  const enMap = new Map<number, any>();
  if (enData?.results) {
    for (const item of enData.results) {
      enMap.set(item.id, item);
    }
  }

  const rawResults = arData?.results || enData?.results || [];
  if (rawResults.length === 0) {
    return { ok: true, results: [], total_results: 0 };
  }

  // Duplicate detection against DB
  const [existingMoviesRes, existingSeriesRes] = await Promise.all([
    executeAdminRead<Array<{ id: string; slug: string; title_ar: string; title_original: string; metadata: any }>>(
      "movies",
      "?select=id,slug,title_ar,title_original,metadata"
    ),
    executeAdminRead<Array<{ id: string; slug: string; title_ar: string; title_original: string; metadata: any }>>(
      "series",
      "?select=id,slug,title_ar,title_original,metadata"
    ),
  ]);

  const existingMovies = existingMoviesRes.ok ? existingMoviesRes.data : [];
  const existingSeries = existingSeriesRes.ok ? existingSeriesRes.data : [];

  const normalized: TmdbSearchResult[] = [];

  for (const item of rawResults) {
    const itemType = item.media_type || (mediaType === "multi" ? (item.title ? "movie" : "tv") : mediaType);
    if (itemType !== "movie" && itemType !== "tv") continue;

    const enItem = enMap.get(item.id) || {};
    const titleAr = item.title || item.name || "";
    const titleEn = enItem.title || enItem.name || item.original_title || item.original_name || "";
    const overview = item.overview || enItem.overview || "";
    const releaseDate = item.release_date || item.first_air_date || enItem.release_date || enItem.first_air_date || "";
    const year = releaseDate ? parseInt(releaseDate.split("-")[0], 10) || 2026 : 2026;
    const posterPath = item.poster_path || enItem.poster_path;
    const backdropPath = item.backdrop_path || enItem.backdrop_path;

    // Check if in DB
    let existingMatch: { id: string; slug: string } | undefined;
    if (itemType === "movie") {
      existingMatch = existingMovies.find((m) => {
        const metaId = Number(m.metadata?.tmdb_id);
        if (metaId === item.id) return true;
        const normOriginal = (m.title_original || "").trim().toLowerCase();
        const normSearchEn = titleEn.trim().toLowerCase();
        if (normOriginal && normOriginal === normSearchEn) return true;
        return false;
      });
    } else {
      existingMatch = existingSeries.find((s) => {
        const metaId = Number(s.metadata?.tmdb_id);
        if (metaId === item.id) return true;
        const normOriginal = (s.title_original || "").trim().toLowerCase();
        const normSearchEn = titleEn.trim().toLowerCase();
        if (normOriginal && normOriginal === normSearchEn) return true;
        return false;
      });
    }

    normalized.push({
      id: item.id,
      media_type: itemType,
      title: titleAr || titleEn,
      title_ar: titleAr || titleEn,
      title_original: titleEn,
      overview,
      release_year: year,
      poster_url: posterPath ? `${TMDB_IMAGE_BASE}/w500${posterPath}` : null,
      backdrop_url: backdropPath ? `${TMDB_IMAGE_BASE}/original${backdropPath}` : null,
      vote_average: Number(item.vote_average?.toFixed(1)) || 8.0,
      existingInDb: Boolean(existingMatch),
      existingSlug: existingMatch?.slug,
      existingId: existingMatch?.id,
    });
  }

  return {
    ok: true,
    results: normalized,
    total_results: arData?.total_results || normalized.length,
  };
}

/**
 * Fetches full details for a Movie from TMDB for admin preview and editing.
 */
export async function getTmdbMoviePreview(tmdbId: number): Promise<{ ok: boolean; data?: TmdbMoviePreview; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "غير مصرح." };

  const [arData, enData, imagesData] = await Promise.all([
    tmdbFetch<any>(`/movie/${tmdbId}`, { language: "ar-SA" }),
    tmdbFetch<any>(`/movie/${tmdbId}`, { language: "en-US" }),
    tmdbFetch<any>(`/movie/${tmdbId}/images`, { include_image_language: "ar,en,null" }),
  ]);

  if (!arData && !enData) {
    return { ok: false, error: "تعذر العثور على بيانات الفيلم من TMDB." };
  }

  const primary = arData || enData;
  const secondary = enData || arData;

  const titleAr = (arData?.title || enData?.title || "").trim();
  const titleOriginal = (primary.original_title || secondary.title || "").trim();
  const overviewAr = (arData?.overview || enData?.overview || "").trim();
  const overviewEn = (enData?.overview || "").trim();

  const releaseDate = primary.release_date || secondary.release_date || "";
  const releaseYear = releaseDate ? parseInt(releaseDate.split("-")[0], 10) || 2026 : 2026;
  const runtime = primary.runtime || secondary.runtime || 90;

  // Artwork options
  const availablePosters: TmdbArtworkOption[] = [];
  const availableBackdrops: TmdbArtworkOption[] = [];

  if (imagesData?.posters) {
    for (const p of imagesData.posters.slice(0, 8)) {
      availablePosters.push({
        url: `${TMDB_IMAGE_BASE}/w500${p.file_path}`,
        originalUrl: `${TMDB_IMAGE_BASE}/original${p.file_path}`,
        width: p.width,
        height: p.height,
      });
    }
  }

  if (imagesData?.backdrops) {
    for (const b of imagesData.backdrops.slice(0, 8)) {
      availableBackdrops.push({
        url: `${TMDB_IMAGE_BASE}/w500${b.file_path}`,
        originalUrl: `${TMDB_IMAGE_BASE}/original${b.file_path}`,
        width: b.width,
        height: b.height,
      });
    }
  }

  // Ensure default poster and backdrop are at top
  const primaryPoster = primary.poster_path ? `${TMDB_IMAGE_BASE}/w500${primary.poster_path}` : null;
  const primaryBackdrop = primary.backdrop_path ? `${TMDB_IMAGE_BASE}/original${primary.backdrop_path}` : null;

  if (primaryPoster && !availablePosters.some((p) => p.url === primaryPoster)) {
    availablePosters.unshift({ url: primaryPoster, originalUrl: primaryPoster, width: 500, height: 750 });
  }
  if (primaryBackdrop && !availableBackdrops.some((b) => b.originalUrl === primaryBackdrop)) {
    availableBackdrops.unshift({
      url: `${TMDB_IMAGE_BASE}/w500${primary.backdrop_path}`,
      originalUrl: primaryBackdrop,
      width: 1920,
      height: 1080,
    });
  }

  // Genre category mapping
  const genreIds = (primary.genres || []).map((g: any) => g.id);
  const categorySlugs = mapGenresToCartoonyCategorySlugs(
    genreIds,
    primary.origin_country || [],
    primary.original_language || ""
  );
  const categoryIds = await getCategoryIdsFromSlugs(categorySlugs);

  // Check duplicate in DB
  const existingRes = await executeAdminRead<Array<{ id: string; slug: string; title_ar: string; metadata: any }>>(
    "movies",
    `?select=id,slug,title_ar,metadata`
  );
  let existingRecord: TmdbMoviePreview["existing_record"] = null;
  if (existingRes.ok && existingRes.data) {
    const found = existingRes.data.find((m) => {
      if (Number(m.metadata?.tmdb_id) === tmdbId) return true;
      if (m.slug === slugify(titleOriginal)) return true;
      return false;
    });
    if (found) {
      existingRecord = {
        id: found.id,
        slug: found.slug,
        title_ar: found.title_ar,
        video_url: found.metadata?.video_url,
      };
    }
  }

  const generatedSlug = slugify(titleOriginal) || `movie-${tmdbId}`;

  return {
    ok: true,
    data: {
      tmdb_id: tmdbId,
      title_ar: titleAr,
      title_original: titleOriginal,
      subtitle_ar: primary.tagline ? primary.tagline : "",
      franchise_ar: titleAr,
      slug: existingRecord ? existingRecord.slug : generatedSlug,
      overview_ar: overviewAr,
      overview_en: overviewEn,
      release_year: releaseYear,
      runtime_minutes: runtime,
      duration_label_ar: formatDurationLabel(runtime),
      rating: Number((primary.vote_average || 8.0).toFixed(1)),
      age_rating: "6+",
      audio_badge: "dubbed",
      theme: "forest",
      accent_color: "#F5A623",
      poster_url: availablePosters[0]?.url || primaryPoster,
      backdrop_url: availableBackdrops[0]?.originalUrl || primaryBackdrop,
      available_posters: availablePosters,
      available_backdrops: availableBackdrops,
      category_ids: categoryIds,
      existing_record: existingRecord,
    },
  };
}

/**
 * Fetches full details for a TV Series from TMDB including seasons for admin preview.
 */
export async function getTmdbSeriesPreview(
  tmdbId: number,
  includeSpecials = false
): Promise<{ ok: boolean; data?: TmdbSeriesPreview; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "غير مصرح." };

  const [arData, enData, imagesData] = await Promise.all([
    tmdbFetch<any>(`/tv/${tmdbId}`, { language: "ar-SA" }),
    tmdbFetch<any>(`/tv/${tmdbId}`, { language: "en-US" }),
    tmdbFetch<any>(`/tv/${tmdbId}/images`, { include_image_language: "ar,en,null" }),
  ]);

  if (!arData && !enData) {
    return { ok: false, error: "تعذر العثور على بيانات المسلسل من TMDB." };
  }

  const primary = arData || enData;
  const secondary = enData || arData;

  const titleAr = (arData?.name || enData?.name || "").trim();
  const titleOriginal = (primary.original_name || secondary.name || "").trim();
  const overviewAr = (arData?.overview || enData?.overview || "").trim();
  const overviewEn = (enData?.overview || "").trim();

  const releaseDate = primary.first_air_date || secondary.first_air_date || "";
  const releaseYear = releaseDate ? parseInt(releaseDate.split("-")[0], 10) || 2026 : 2026;

  // Artwork options
  const availablePosters: TmdbArtworkOption[] = [];
  const availableBackdrops: TmdbArtworkOption[] = [];

  if (imagesData?.posters) {
    for (const p of imagesData.posters.slice(0, 8)) {
      availablePosters.push({
        url: `${TMDB_IMAGE_BASE}/w500${p.file_path}`,
        originalUrl: `${TMDB_IMAGE_BASE}/original${p.file_path}`,
        width: p.width,
        height: p.height,
      });
    }
  }

  if (imagesData?.backdrops) {
    for (const b of imagesData.backdrops.slice(0, 8)) {
      availableBackdrops.push({
        url: `${TMDB_IMAGE_BASE}/w500${b.file_path}`,
        originalUrl: `${TMDB_IMAGE_BASE}/original${b.file_path}`,
        width: b.width,
        height: b.height,
      });
    }
  }

  const primaryPoster = primary.poster_path ? `${TMDB_IMAGE_BASE}/w500${primary.poster_path}` : null;
  const primaryBackdrop = primary.backdrop_path ? `${TMDB_IMAGE_BASE}/original${primary.backdrop_path}` : null;

  // Check duplicate in DB
  const existingRes = await executeAdminRead<Array<{ id: string; slug: string; title_ar: string; metadata: any }>>(
    "series",
    `?select=id,slug,title_ar,metadata`
  );

  let existingRecord: TmdbSeriesPreview["existing_record"] = null;
  let existingDbSeasons: Array<{ id: string; season_number: number; episodes: Array<{ id: string; episode_number: number }> }> = [];

  if (existingRes.ok && existingRes.data) {
    const found = existingRes.data.find((s) => {
      if (Number(s.metadata?.tmdb_id) === tmdbId) return true;
      if (s.slug === slugify(titleOriginal)) return true;
      return false;
    });
    if (found) {
      existingRecord = {
        id: found.id,
        slug: found.slug,
        title_ar: found.title_ar,
      };

      // Load existing seasons and episodes
      const sRes = await executeAdminRead<any>(
        "seasons",
        `?series_id=eq.${found.id}&select=id,season_number,episodes(id,episode_number)`
      );
      if (sRes.ok && sRes.data) {
        existingDbSeasons = sRes.data;
      }
    }
  }

  // Category mapping
  const genreIds = (primary.genres || []).map((g: any) => g.id);
  const categorySlugs = mapGenresToCartoonyCategorySlugs(
    genreIds,
    primary.origin_country || [],
    primary.original_language || ""
  );
  const categoryIds = await getCategoryIdsFromSlugs(categorySlugs);

  // Parse seasons
  const rawSeasons = primary.seasons || [];
  const seasons: TmdbSeasonPreview[] = [];

  for (const s of rawSeasons) {
    if (!includeSpecials && s.season_number === 0) continue;

    const existingSeason = existingDbSeasons.find((ds) => ds.season_number === s.season_number);

    seasons.push({
      tmdb_id: s.id,
      season_number: s.season_number,
      name_ar: s.name || `الموسم ${s.season_number}`,
      name_original: s.name || `Season ${s.season_number}`,
      overview_ar: s.overview || "",
      poster_url: s.poster_path ? `${TMDB_IMAGE_BASE}/w500${s.poster_path}` : null,
      air_date: s.air_date || null,
      episode_count: s.episode_count || 0,
      episodes: [], // Episodes are lazy loaded or loaded on demand
      already_in_db: Boolean(existingSeason),
      existing_id: existingSeason?.id,
      selected: true,
    });
  }

  return {
    ok: true,
    data: {
      tmdb_id: tmdbId,
      title_ar: titleAr,
      title_original: titleOriginal,
      subtitle_ar: primary.tagline ? primary.tagline : "",
      franchise_ar: titleAr,
      slug: existingRecord ? existingRecord.slug : (slugify(titleOriginal) || `series-${tmdbId}`),
      overview_ar: overviewAr,
      overview_en: overviewEn,
      release_year: releaseYear,
      rating: Number((primary.vote_average || 8.0).toFixed(1)),
      age_rating: "6+",
      audio_badge: "dubbed",
      theme: "desert",
      accent_color: "#F5A623",
      poster_url: availablePosters[0]?.url || primaryPoster,
      backdrop_url: availableBackdrops[0]?.originalUrl || primaryBackdrop,
      available_posters: availablePosters,
      available_backdrops: availableBackdrops,
      category_ids: categoryIds,
      seasons,
      existing_record: existingRecord,
    },
  };
}

/**
 * Fetches episodes for a specific season of a TV Series.
 */
export async function getTmdbSeasonEpisodes(
  tmdbSeriesId: number,
  seasonNumber: number,
  existingSeriesId?: string
): Promise<{ ok: boolean; episodes: TmdbEpisodePreview[]; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { ok: false, episodes: [], error: "غير مصرح." };

  const [arData, enData] = await Promise.all([
    tmdbFetch<any>(`/tv/${tmdbSeriesId}/season/${seasonNumber}`, { language: "ar-SA" }),
    tmdbFetch<any>(`/tv/${tmdbSeriesId}/season/${seasonNumber}`, { language: "en-US" }),
  ]);

  if (!arData && !enData) {
    return { ok: false, episodes: [], error: `تعذر تحميل حلقات الموسم ${seasonNumber} من TMDB.` };
  }

  const enEpMap = new Map<number, any>();
  if (enData?.episodes) {
    for (const ep of enData.episodes) {
      enEpMap.set(ep.episode_number, ep);
    }
  }

  // Check existing episodes in Cartoony DB if series exists
  const existingEpNumbers = new Set<number>();
  const existingEpIdMap = new Map<number, string>();

  if (existingSeriesId) {
    const sRes = await executeAdminRead<Array<{ id: string }>>(
      "seasons",
      `?series_id=eq.${existingSeriesId}&season_number=eq.${seasonNumber}&select=id&limit=1`
    );
    if (sRes.ok && sRes.data[0]) {
      const seasonId = sRes.data[0].id;
      const epRes = await executeAdminRead<Array<{ id: string; episode_number: number }>>(
        "episodes",
        `?season_id=eq.${seasonId}&select=id,episode_number`
      );
      if (epRes.ok && epRes.data) {
        for (const ep of epRes.data) {
          existingEpNumbers.add(ep.episode_number);
          existingEpIdMap.set(ep.episode_number, ep.id);
        }
      }
    }
  }

  const rawEpisodes = arData?.episodes || enData?.episodes || [];
  const episodes: TmdbEpisodePreview[] = [];

  for (const ep of rawEpisodes) {
    const epNum = ep.episode_number;
    const enEp = enEpMap.get(epNum) || {};

    const titleAr = (ep.name && !ep.name.startsWith("Episode") ? ep.name : enEp.name || `الحلقة ${epNum}`).trim();
    const titleEn = (enEp.name || ep.name || `Episode ${epNum}`).trim();
    const overview = (ep.overview || enEp.overview || "").trim();
    const stillPath = ep.still_path || enEp.still_path;
    const runtime = ep.runtime || enEp.runtime || 22;

    const alreadyInDb = existingEpNumbers.has(epNum);

    episodes.push({
      tmdb_id: ep.id,
      season_number: seasonNumber,
      episode_number: epNum,
      title_ar: titleAr,
      title_original: titleEn,
      overview_ar: overview,
      duration_minutes: runtime > 0 ? runtime : 22,
      still_url: stillPath ? `${TMDB_IMAGE_BASE}/w500${stillPath}` : null,
      air_date: ep.air_date || null,
      already_in_db: alreadyInDb,
      existing_id: existingEpIdMap.get(epNum),
      selected: !alreadyInDb, // Pre-select only missing episodes by default!
    });
  }

  return { ok: true, episodes };
}

/**
 * Saves or updates a Movie imported from TMDB.
 */
export async function importTmdbMovie(payload: {
  tmdb_id: number;
  title_ar: string;
  title_original: string;
  subtitle_ar?: string;
  franchise_ar?: string;
  slug: string;
  description_ar: string;
  release_year: number;
  duration_minutes: number;
  duration_label_ar?: string;
  rating: number;
  age_rating?: string;
  audio_badge: AudioBadgeType;
  theme: ArtThemeType;
  accent_color: string;
  poster_url?: string;
  backdrop_url?: string;
  category_ids: string[];
  existing_movie_id?: string;
}): Promise<{ ok: boolean; movie_id?: string; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "غير مصرح." };

  const durationLabel =
    payload.duration_label_ar || formatDurationLabel(payload.duration_minutes);

  // 1. If updating an existing movie
  if (payload.existing_movie_id) {
    // Read existing metadata to preserve video_url and custom fields
    const prevRead = await executeAdminRead<Array<{ metadata: any; video_url?: string }>>(
      "movies",
      `?id=eq.${payload.existing_movie_id}&select=metadata&limit=1`
    );
    const prevMeta = prevRead.ok && prevRead.data[0] ? prevRead.data[0].metadata || {} : {};

    const updateBody = {
      title_ar: payload.title_ar,
      title_original: payload.title_original,
      subtitle_ar: payload.subtitle_ar || "",
      franchise_ar: payload.franchise_ar || payload.title_ar,
      description_ar: payload.description_ar,
      release_year: payload.release_year,
      duration_minutes: payload.duration_minutes,
      duration_label_ar: durationLabel,
      rating: payload.rating,
      age_rating: payload.age_rating || "6+",
      audio_badge: payload.audio_badge,
      theme: payload.theme,
      accent_color: payload.accent_color,
      poster_url: payload.poster_url || null,
      backdrop_url: payload.backdrop_url || null,
      metadata: {
        ...prevMeta,
        tmdb_id: payload.tmdb_id,
        imported_from: "tmdb",
        imported_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    const updateRes = await executeAdminWrite(
      "movies",
      "PATCH",
      updateBody,
      `?id=eq.${payload.existing_movie_id}`
    );

    if (!updateRes.ok) {
      return { ok: false, error: updateRes.error ?? "فشل تحديث الفيلم." };
    }

    // Sync categories
    await syncMovieCategories(payload.existing_movie_id, payload.category_ids);
    return { ok: true, movie_id: payload.existing_movie_id };
  }

  // 2. Insert new Movie (Draft by default)
  const insertBody = {
    slug: payload.slug,
    title_ar: payload.title_ar,
    title_original: payload.title_original,
    subtitle_ar: payload.subtitle_ar || "",
    franchise_ar: payload.franchise_ar || payload.title_ar,
    description_ar: payload.description_ar,
    release_year: payload.release_year,
    duration_minutes: payload.duration_minutes,
    duration_label_ar: durationLabel,
    rating: payload.rating,
    age_rating: payload.age_rating || "6+",
    audio_badge: payload.audio_badge,
    theme: payload.theme,
    accent_color: payload.accent_color,
    poster_url: payload.poster_url || null,
    backdrop_url: payload.backdrop_url || null,
    status: "draft" as PublicationStatus,
    metadata: {
      tmdb_id: payload.tmdb_id,
      imported_from: "tmdb",
      imported_at: new Date().toISOString(),
    },
  };

  const createRes = await executeAdminWrite<Array<{ id: string }>>(
    "movies",
    "POST",
    insertBody
  );

  if (!createRes.ok || !createRes.data || !createRes.data[0]) {
    return { ok: false, error: (!createRes.ok ? createRes.error : undefined) ?? "فشل إنشاء سجل الفيلم." };
  }

  const createdId = createRes.data[0].id;
  await syncMovieCategories(createdId, payload.category_ids);

  return { ok: true, movie_id: createdId };
}

async function syncMovieCategories(movieId: string, categoryIds: string[]) {
  await executeAdminWrite("movie_categories", "DELETE", undefined, `?movie_id=eq.${movieId}`);
  if (categoryIds.length === 0) return;

  const joins = categoryIds.map((cid, idx) => ({
    movie_id: movieId,
    category_id: cid,
    is_primary: idx === 0,
  }));
  await executeAdminWrite("movie_categories", "POST", joins);
}

async function syncSeriesCategories(seriesId: string, categoryIds: string[]) {
  await executeAdminWrite("series_categories", "DELETE", undefined, `?series_id=eq.${seriesId}`);
  if (categoryIds.length === 0) return;

  const joins = categoryIds.map((cid, idx) => ({
    series_id: seriesId,
    category_id: cid,
    is_primary: idx === 0,
  }));
  await executeAdminWrite("series_categories", "POST", joins);
}

/**
 * Saves or updates a Series and its selected Seasons & Episodes from TMDB.
 */
export async function importTmdbSeries(payload: {
  tmdb_id: number;
  title_ar: string;
  title_original: string;
  subtitle_ar?: string;
  franchise_ar?: string;
  slug: string;
  description_ar: string;
  release_year: number;
  rating: number;
  age_rating?: string;
  audio_badge: AudioBadgeType;
  theme: ArtThemeType;
  accent_color: string;
  poster_url?: string;
  backdrop_url?: string;
  category_ids: string[];
  existing_series_id?: string;
  seasons: Array<{
    season_number: number;
    title_ar: string;
    title_original?: string;
    description_ar?: string;
    poster_url?: string;
    episodes: Array<{
      episode_number: number;
      title_ar: string;
      title_original?: string;
      description_ar?: string;
      duration_minutes: number;
      still_url?: string;
      tmdb_id?: number;
    }>;
  }>;
}): Promise<{
  ok: boolean;
  series_id?: string;
  seasons_count: number;
  episodes_count: number;
  error?: string;
}> {
  const session = await getAdminSession();
  if (!session) return { ok: false, seasons_count: 0, episodes_count: 0, error: "غير مصرح." };

  let seriesId = payload.existing_series_id;

  // 1. Create or Update Series
  if (seriesId) {
    const prevRead = await executeAdminRead<Array<{ metadata: any }>>(
      "series",
      `?id=eq.${seriesId}&select=metadata&limit=1`
    );
    const prevMeta = prevRead.ok && prevRead.data[0] ? prevRead.data[0].metadata || {} : {};

    await executeAdminWrite(
      "series",
      "PATCH",
      {
        title_ar: payload.title_ar,
        title_original: payload.title_original,
        subtitle_ar: payload.subtitle_ar || "",
        franchise_ar: payload.franchise_ar || payload.title_ar,
        description_ar: payload.description_ar,
        release_year: payload.release_year,
        rating: payload.rating,
        age_rating: payload.age_rating || "6+",
        audio_badge: payload.audio_badge,
        theme: payload.theme,
        accent_color: payload.accent_color,
        poster_url: payload.poster_url || null,
        backdrop_url: payload.backdrop_url || null,
        metadata: {
          ...prevMeta,
          tmdb_id: payload.tmdb_id,
          imported_from: "tmdb",
          imported_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      `?id=eq.${seriesId}`
    );
  } else {
    const insertRes = await executeAdminWrite<Array<{ id: string }>>(
      "series",
      "POST",
      {
        slug: payload.slug,
        title_ar: payload.title_ar,
        title_original: payload.title_original,
        subtitle_ar: payload.subtitle_ar || "",
        franchise_ar: payload.franchise_ar || payload.title_ar,
        description_ar: payload.description_ar,
        release_year: payload.release_year,
        rating: payload.rating,
        age_rating: payload.age_rating || "6+",
        audio_badge: payload.audio_badge,
        theme: payload.theme,
        accent_color: payload.accent_color,
        poster_url: payload.poster_url || null,
        backdrop_url: payload.backdrop_url || null,
        status: "draft" as PublicationStatus,
        metadata: {
          tmdb_id: payload.tmdb_id,
          imported_from: "tmdb",
          imported_at: new Date().toISOString(),
        },
      }
    );

    if (!insertRes.ok || !insertRes.data || !insertRes.data[0]) {
      const err = !insertRes.ok ? insertRes.error : undefined;
      return { ok: false, seasons_count: 0, episodes_count: 0, error: err ?? "فشل إنشاء المسلسل." };
    }
    seriesId = insertRes.data[0].id;
  }

  await syncSeriesCategories(seriesId, payload.category_ids);

  // 2. Fetch existing seasons for this series to prevent duplicates
  const existingSeasonsRes = await executeAdminRead<Array<{ id: string; season_number: number }>>(
    "seasons",
    `?series_id=eq.${seriesId}&select=id,season_number`
  );
  const existingSeasonsMap = new Map<number, string>();
  if (existingSeasonsRes.ok && existingSeasonsRes.data) {
    for (const s of existingSeasonsRes.data) {
      existingSeasonsMap.set(s.season_number, s.id);
    }
  }

  let totalSeasonsImported = 0;
  let totalEpisodesImported = 0;

  // 3. Process each selected season
  for (const s of payload.seasons) {
    if (s.season_number <= 0) continue; // Skip season 0 specials due to schema constraint

    let seasonId = existingSeasonsMap.get(s.season_number);
    const seasonSlug = `${payload.slug}-s${s.season_number}`;

    if (!seasonId) {
      const seasonRes = await executeAdminWrite<Array<{ id: string }>>(
        "seasons",
        "POST",
        {
          series_id: seriesId,
          season_number: s.season_number,
          slug: seasonSlug,
          title_ar: s.title_ar || `الموسم ${s.season_number}`,
          title_original: s.title_original || `Season ${s.season_number}`,
          description_ar: s.description_ar || "",
          poster_url: s.poster_url || null,
          status: "draft" as PublicationStatus,
          metadata: {
            imported_from: "tmdb",
          },
        }
      );

      if (seasonRes.ok && seasonRes.data && seasonRes.data[0]) {
        seasonId = seasonRes.data[0].id;
        existingSeasonsMap.set(s.season_number, seasonId);
        totalSeasonsImported++;
      } else {
        continue; // Could not create season, skip episodes
      }
    }

    // 4. Fetch existing episodes for this season
    const existingEpisodesRes = await executeAdminRead<Array<{ id: string; episode_number: number }>>(
      "episodes",
      `?season_id=eq.${seasonId}&select=id,episode_number`
    );
    const existingEpNumbers = new Set<number>();
    if (existingEpisodesRes.ok && existingEpisodesRes.data) {
      for (const ep of existingEpisodesRes.data) {
        existingEpNumbers.add(ep.episode_number);
      }
    }

    // 5. Batch insert missing episodes
    const newEpisodesToInsert = [];
    for (const ep of s.episodes) {
      if (existingEpNumbers.has(ep.episode_number)) {
        continue; // Skip existing episode to preserve custom video_url & metadata
      }

      const epSlug = `${payload.slug}-s${s.season_number}-e${ep.episode_number}`;

      newEpisodesToInsert.push({
        series_id: seriesId,
        season_id: seasonId,
        episode_number: ep.episode_number,
        slug: epSlug,
        title_ar: ep.title_ar || `الحلقة ${ep.episode_number}`,
        title_original: ep.title_original || `Episode ${ep.episode_number}`,
        description_ar: ep.description_ar || "",
        still_url: ep.still_url || null,
        duration_minutes: ep.duration_minutes > 0 ? ep.duration_minutes : 22,
        audio_badge: payload.audio_badge,
        status: "draft" as PublicationStatus,
        metadata: {
          tmdb_id: ep.tmdb_id,
          imported_from: "tmdb",
        },
      });
    }

    if (newEpisodesToInsert.length > 0) {
      // Insert in chunks of 50 to avoid request body limits
      for (let i = 0; i < newEpisodesToInsert.length; i += 50) {
        const chunk = newEpisodesToInsert.slice(i, i + 50);
        const epWriteRes = await executeAdminWrite("episodes", "POST", chunk);
        if (epWriteRes.ok) {
          totalEpisodesImported += chunk.length;
        }
      }
    }
  }

  return {
    ok: true,
    series_id: seriesId,
    seasons_count: totalSeasonsImported,
    episodes_count: totalEpisodesImported,
  };
}
