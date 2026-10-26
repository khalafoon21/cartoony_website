import "server-only";

import { getAdminSession } from "./admin-auth";
import { deleteStorageImageIfOwnedAndUnused } from "./storage-admin";
import { executeAdminRead, executeAdminWrite } from "./supabase-server";
import { extractIframeSrc, isVideoEmbedUrl, type VideoServer } from "./video-helpers";
import type {
  ArtThemeType,
  AudioBadgeType,
  DbCategoryRow,
  DbMovieCategoryJoin,
  PublicationStatus,
} from "./movies-admin";

export type DbSeriesRow = {
  id: string;
  slug: string;
  title_ar: string;
  subtitle_ar: string;
  title_original: string;
  franchise_ar: string;
  description_ar: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_year: number;
  age_rating: string;
  rating: number;
  audio_badge: AudioBadgeType;
  theme: ArtThemeType;
  accent_color: string;
  is_featured: boolean;
  is_most_watched: boolean;
  is_recently_added: boolean;
  metadata: Record<string, unknown>;
  status: PublicationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  series_categories?: DbMovieCategoryJoin[];
  seasons?: DbSeasonRow[];
};

export type DbSeasonRow = {
  id: string;
  series_id: string;
  season_number: number;
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar: string;
  poster_url: string | null;
  release_year: number | null;
  metadata: Record<string, unknown>;
  status: PublicationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  episodes?: DbEpisodeRow[];
  episode_count?: number;
};

export type DbEpisodeRow = {
  id: string;
  series_id: string;
  season_id: string;
  episode_number: number;
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar: string;
  still_url: string | null;
  duration_minutes: number;
  audio_badge: AudioBadgeType;
  metadata: Record<string, unknown>;
  status: PublicationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ValidatedSeriesPayload = {
  slug: string;
  title_ar: string;
  subtitle_ar: string;
  title_original: string;
  franchise_ar: string;
  description_ar: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_year: number;
  age_rating: string;
  rating: number;
  audio_badge: AudioBadgeType;
  theme: ArtThemeType;
  accent_color: string;
  is_featured: boolean;
  is_most_watched: boolean;
  is_recently_added: boolean;
  metadata: Record<string, unknown>;
  status: PublicationStatus;
  category_ids: string[];
};

export type ValidatedSeasonPayload = {
  series_id: string;
  season_number: number;
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar: string;
  poster_url: string | null;
  release_year: number | null;
  metadata: Record<string, unknown>;
  status: PublicationStatus;
};

export type ValidatedEpisodePayload = {
  series_id: string;
  season_id: string;
  episode_number: number;
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar: string;
  still_url: string | null;
  duration_minutes: number;
  audio_badge: AudioBadgeType;
  metadata: Record<string, unknown>;
  status: PublicationStatus;
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isValidUrlOrRelativePath(value: string): boolean {
  if (value.startsWith("/")) {
    return value.length > 1 && !value.startsWith("//") && !value.includes(" ");
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateSeriesPayload(raw: {
  slug?: string;
  title_ar?: string;
  subtitle_ar?: string;
  title_original?: string;
  franchise_ar?: string;
  description_ar?: string;
  poster_url?: string;
  backdrop_url?: string;
  release_year?: string | number;
  age_rating?: string;
  rating?: string | number;
  audio_badge?: string;
  theme?: string;
  accent_color?: string;
  is_featured?: boolean;
  is_most_watched?: boolean;
  is_recently_added?: boolean;
  metadata?: Record<string, unknown>;
  status?: string;
  category_ids?: string[];
}): { ok: true; data: ValidatedSeriesPayload } | { ok: false; error: string } {
  const title_ar = String(raw.title_ar ?? "").trim();
  if (!title_ar || title_ar.length > 200) {
    return { ok: false, error: "العنوان بالعربية مطلوب ويجب ألا يتجاوز 200 حرف." };
  }

  const title_original = String(raw.title_original ?? "").trim();
  if (!title_original || title_original.length > 200) {
    return { ok: false, error: "العنوان الأصلي (بالإنجليزية) مطلوب ويجب ألا يتجاوز 200 حرف." };
  }

  const slug = String(raw.slug ?? "")
    .trim()
    .toLowerCase();
  if (!slug || slug.length < 2 || slug.length > 120 || !SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      error: "الرابط المختصر (Slug) غير صالح: استخدم أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط.",
    };
  }

  const description_ar = String(raw.description_ar ?? "").trim();
  if (!description_ar || description_ar.length < 5 || description_ar.length > 2500) {
    return { ok: false, error: "وصف المسلسل بالعربية مطلوب (من 5 إلى 2500 حرف)." };
  }

  const subtitle_ar = String(raw.subtitle_ar ?? "").trim().slice(0, 200);
  const franchise_ar = String(raw.franchise_ar ?? "").trim().slice(0, 150) || title_ar;

  const release_year = Number.parseInt(String(raw.release_year ?? ""), 10);
  if (Number.isNaN(release_year) || release_year < 1920 || release_year > 2100) {
    return { ok: false, error: "سنة الإصدار يجب أن تكون بين 1920 و 2100." };
  }

  const ratingNum = Number.parseFloat(String(raw.rating ?? "8.0"));
  if (Number.isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10) {
    return { ok: false, error: "التقييم يجب أن يكون بين 0.0 و 10.0." };
  }
  const rating = Math.round(ratingNum * 10) / 10;

  const age_rating = String(raw.age_rating ?? "6+").trim().slice(0, 24);
  if (!age_rating) {
    return { ok: false, error: "التصنيف العمري مطلوب." };
  }

  const audio_badge: AudioBadgeType =
    raw.audio_badge === "subtitled" ? "subtitled" : "dubbed";

  const statusInput = String(raw.status ?? "draft").trim();
  if (statusInput !== "draft" && statusInput !== "published" && statusInput !== "archived") {
    return { ok: false, error: "حالة النشر غير صالحة." };
  }
  const status: PublicationStatus = statusInput;

  const rawPoster = String(raw.poster_url ?? "").trim();
  if (rawPoster && !isValidUrlOrRelativePath(rawPoster)) {
    return { ok: false, error: "رابط الملصق (Poster URL) غير صالح." };
  }
  const poster_url = rawPoster || null;

  const rawBackdrop = String(raw.backdrop_url ?? "").trim();
  if (rawBackdrop && !isValidUrlOrRelativePath(rawBackdrop)) {
    return { ok: false, error: "رابط الخلفية (Backdrop URL) غير صالح." };
  }
  const backdrop_url = rawBackdrop || null;

  const allowedThemes: ArtThemeType[] = ["forest", "space", "ocean", "desert", "sky"];
  const theme: ArtThemeType = allowedThemes.includes(raw.theme as ArtThemeType)
    ? (raw.theme as ArtThemeType)
    : "desert";

  const rawAccent = String(raw.accent_color ?? "#F5A623").trim();
  const accent_color = HEX_COLOR_REGEX.test(rawAccent) ? rawAccent : "#F5A623";

  const category_ids = Array.from(
    new Set(
      (raw.category_ids ?? [])
        .map((id) => String(id).trim())
        .filter((id) => UUID_REGEX.test(id))
    )
  );

  return {
    ok: true,
    data: {
      slug,
      title_ar,
      subtitle_ar,
      title_original,
      franchise_ar,
      description_ar,
      poster_url,
      backdrop_url,
      release_year,
      age_rating,
      rating,
      audio_badge,
      theme,
      accent_color,
      is_featured: Boolean(raw.is_featured),
      is_most_watched: Boolean(raw.is_most_watched),
      is_recently_added: Boolean(raw.is_recently_added),
      metadata: raw.metadata ?? {},
      status,
      category_ids,
    },
  };
}

export function validateSeasonPayload(
  seriesSlug: string,
  raw: {
    series_id?: string;
    season_number?: string | number;
    slug?: string;
    title_ar?: string;
    title_original?: string;
    description_ar?: string;
    poster_url?: string;
    release_year?: string | number;
    metadata?: Record<string, unknown>;
    status?: string;
  }
): { ok: true; data: ValidatedSeasonPayload } | { ok: false; error: string } {
  const series_id = String(raw.series_id ?? "").trim();
  if (!UUID_REGEX.test(series_id)) {
    return { ok: false, error: "معرف المسلسل غير صالح." };
  }

  const season_number = Number.parseInt(String(raw.season_number ?? ""), 10);
  if (Number.isNaN(season_number) || season_number <= 0 || season_number > 999) {
    return { ok: false, error: "رقم الموسم يجب أن يكون رقماً صحيحاً أكبر من 0." };
  }

  const title_ar = String(raw.title_ar ?? "").trim() || `الموسم ${season_number}`;
  if (title_ar.length > 200) {
    return { ok: false, error: "عنوان الموسم بالعربية يجب ألا يتجاوز 200 حرف." };
  }

  const title_original = String(raw.title_original ?? "").trim().slice(0, 200);
  const description_ar = String(raw.description_ar ?? "").trim().slice(0, 2000);

  const defaultSlug = `${seriesSlug}-season-${season_number}`;
  const slugInput = String(raw.slug ?? "").trim().toLowerCase();
  const slug = slugInput || defaultSlug;
  if (!SLUG_REGEX.test(slug)) {
    return { ok: false, error: "الرابط المختصر للموسم (Slug) غير صالح." };
  }

  let release_year: number | null = null;
  if (raw.release_year && String(raw.release_year).trim() !== "") {
    const yr = Number.parseInt(String(raw.release_year), 10);
    if (!Number.isNaN(yr) && yr >= 1920 && yr <= 2100) {
      release_year = yr;
    }
  }

  const rawPoster = String(raw.poster_url ?? "").trim();
  if (rawPoster && !isValidUrlOrRelativePath(rawPoster)) {
    return { ok: false, error: "رابط ملصق الموسم غير صالح." };
  }
  const poster_url = rawPoster || null;

  const statusInput = String(raw.status ?? "draft").trim();
  const status: PublicationStatus =
    statusInput === "published" || statusInput === "archived" ? statusInput : "draft";

  return {
    ok: true,
    data: {
      series_id,
      season_number,
      slug,
      title_ar,
      title_original,
      description_ar,
      poster_url,
      release_year,
      metadata: raw.metadata ?? {},
      status,
    },
  };
}

export function validateEpisodePayload(
  seriesSlug: string,
  seasonNumber: number,
  raw: {
    series_id?: string;
    season_id?: string;
    episode_number?: string | number;
    slug?: string;
    title_ar?: string;
    title_original?: string;
    description_ar?: string;
    still_url?: string;
    duration_minutes?: string | number;
    audio_badge?: string;
    video_url?: string;
    video_type?: string;
    servers?: string | VideoServer[];
    subtitle_url?: string;
    subtitle_lang?: string;
    metadata?: Record<string, unknown>;
    status?: string;
  }
): { ok: true; data: ValidatedEpisodePayload } | { ok: false; error: string } {
  const series_id = String(raw.series_id ?? "").trim();
  const season_id = String(raw.season_id ?? "").trim();
  if (!UUID_REGEX.test(series_id) || !UUID_REGEX.test(season_id)) {
    return { ok: false, error: "معرف المسلسل أو الموسم غير صالح." };
  }

  const episode_number = Number.parseInt(String(raw.episode_number ?? ""), 10);
  if (Number.isNaN(episode_number) || episode_number <= 0 || episode_number > 9999) {
    return { ok: false, error: "رقم الحلقة يجب أن يكون رقماً صحيحاً أكبر من 0." };
  }

  const title_ar = String(raw.title_ar ?? "").trim() || `الحلقة ${episode_number}`;
  if (title_ar.length > 200) {
    return { ok: false, error: "عنوان الحلقة بالعربية يجب ألا يتجاوز 200 حرف." };
  }

  const title_original = String(raw.title_original ?? "").trim().slice(0, 200);
  const description_ar = String(raw.description_ar ?? "").trim().slice(0, 2000);

  const defaultSlug = `${seriesSlug}-s${seasonNumber}-e${episode_number}`;
  const slugInput = String(raw.slug ?? "").trim().toLowerCase();
  const slug = slugInput || defaultSlug;
  if (!SLUG_REGEX.test(slug)) {
    return { ok: false, error: "الرابط المختصر للحلقة (Slug) غير صالح." };
  }

  const duration_minutes = Number.parseInt(String(raw.duration_minutes ?? "22"), 10);
  if (Number.isNaN(duration_minutes) || duration_minutes <= 0 || duration_minutes > 600) {
    return { ok: false, error: "مدة الحلقة بالدقائق يجب أن تكون بين 1 و 600 دقيقة." };
  }

  const rawStill = String(raw.still_url ?? "").trim();
  if (rawStill && !isValidUrlOrRelativePath(rawStill)) {
    return { ok: false, error: "رابط صورة الحلقة (Thumbnail) غير صالح." };
  }
  const still_url = rawStill || null;

  const audio_badge: AudioBadgeType =
    raw.audio_badge === "subtitled" ? "subtitled" : "dubbed";

  const statusInput = String(raw.status ?? "draft").trim();
  const status: PublicationStatus =
    statusInput === "published" || statusInput === "archived" ? statusInput : "draft";

  let rawVideo = extractIframeSrc(String(raw.video_url ?? "").trim());
  let videoType: "direct" | "iframe" =
    raw.video_type === "iframe" || raw.video_type === "direct"
      ? (raw.video_type as "direct" | "iframe")
      : isVideoEmbedUrl(rawVideo)
      ? "iframe"
      : "direct";

  let parsedServers: VideoServer[] = [];
  if (typeof raw.servers === "string" && raw.servers.trim()) {
    try {
      const parsed = JSON.parse(raw.servers);
      if (Array.isArray(parsed)) {
        parsedServers = parsed
          .map((s, idx) => {
            const cleanUrl = extractIframeSrc(String(s.url || "")).trim();
            const sType =
              s.type === "iframe" || s.type === "direct"
                ? s.type
                : isVideoEmbedUrl(cleanUrl)
                ? "iframe"
                : "direct";
            return {
              id: String(s.id || `srv-${idx + 1}`),
              name: String(s.name || `سيرفر ${idx + 1}`).trim(),
              url: cleanUrl,
              type: sType as "direct" | "iframe",
            };
          })
          .filter((s) => s.url && isValidUrlOrRelativePath(s.url));
      }
    } catch {
      // Ignore invalid JSON
    }
  } else if (Array.isArray(raw.servers)) {
    parsedServers = raw.servers
      .map((s, idx) => {
        const cleanUrl = extractIframeSrc(String(s.url || "")).trim();
        const sType =
          s.type === "iframe" || s.type === "direct"
            ? s.type
            : isVideoEmbedUrl(cleanUrl)
            ? "iframe"
            : "direct";
        return {
          id: String(s.id || `srv-${idx + 1}`),
          name: String(s.name || `سيرفر ${idx + 1}`).trim(),
          url: cleanUrl,
          type: sType as "direct" | "iframe",
        };
      })
      .filter((s) => s.url && isValidUrlOrRelativePath(s.url));
  }

  if (!rawVideo && parsedServers.length > 0) {
    rawVideo = parsedServers[0].url;
    videoType = parsedServers[0].type;
  } else if (rawVideo && parsedServers.length === 0) {
    parsedServers = [{ id: "srv-1", name: "السيرفر الأساسي", url: rawVideo, type: videoType }];
  }

  if (rawVideo && !isValidUrlOrRelativePath(rawVideo)) {
    return { ok: false, error: "رابط مصدر الفيديو أو كود التضمين غير صالح. يرجى التأكد من الرابط." };
  }

  const rawSubtitle = String(raw.subtitle_url ?? "").trim();
  if (rawSubtitle && !isValidUrlOrRelativePath(rawSubtitle)) {
    return { ok: false, error: "رابط الترجمة غير صالح. يجب أن يبدأ بـ https:// أو http:// أو /." };
  }

  const metadata: Record<string, unknown> = {
    ...(raw.metadata ?? {}),
  };
  if (rawVideo) {
    metadata.video_url = rawVideo;
    metadata.video_type = videoType;
    metadata.servers = parsedServers;
  } else {
    delete metadata.video_url;
    delete metadata.video_type;
    delete metadata.servers;
  }

  if (rawSubtitle) {
    metadata.subtitle_url = rawSubtitle;
    metadata.subtitle_lang = String(raw.subtitle_lang ?? "ar").trim().slice(0, 10) || "ar";
  } else if ("subtitle_url" in metadata) {
    delete metadata.subtitle_url;
    delete metadata.subtitle_lang;
  }

  return {
    ok: true,
    data: {
      series_id,
      season_id,
      episode_number,
      slug,
      title_ar,
      title_original,
      description_ar,
      still_url,
      duration_minutes,
      audio_badge,
      metadata,
      status,
    },
  };
}

/**
 * Fetches all series with linked categories, season count and episode count.
 */
export async function getAdminSeriesList(): Promise<{
  ok: boolean;
  error?: string;
  series: DbSeriesRow[];
}> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح بالوصول.", series: [] };
  }

  const res = await executeAdminRead<DbSeriesRow[]>(
    "series",
    "?select=*,series_categories(category_id,is_primary,categories(id,slug,title_ar)),seasons(id,season_number,status)&order=created_at.desc"
  );

  if (!res.ok) {
    return { ok: false, error: res.error, series: [] };
  }

  return { ok: true, series: res.data };
}

/**
 * Fetches full details of a series, including all its seasons and episodes.
 */
export async function getAdminSeriesWithDetails(seriesId: string): Promise<{
  ok: boolean;
  error?: string;
  series: DbSeriesRow | null;
}> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح بالوصول.", series: null };
  }

  if (!UUID_REGEX.test(seriesId)) {
    return { ok: false, error: "معرف المسلسل غير صالح.", series: null };
  }

  const res = await executeAdminRead<DbSeriesRow[]>(
    "series",
    `?select=*,series_categories(category_id,is_primary,categories(id,slug,title_ar)),seasons(*,episodes(*))&id=eq.${seriesId}&seasons.order=season_number.asc&seasons.episodes.order=episode_number.asc&limit=1`
  );

  if (!res.ok) {
    return { ok: false, error: res.error, series: null };
  }

  const series = res.data[0] ?? null;
  if (series && Array.isArray(series.seasons)) {
    // Sort seasons and episodes cleanly
    series.seasons.sort((a, b) => a.season_number - b.season_number);
    for (const season of series.seasons) {
      if (Array.isArray(season.episodes)) {
        season.episodes.sort((a, b) => a.episode_number - b.episode_number);
        season.episode_count = season.episodes.length;
      } else {
        season.episode_count = 0;
      }
    }
  }

  return { ok: true, series };
}

/**
 * Syncs series categories in public.series_categories
 */
export async function syncSeriesCategories(
  seriesId: string,
  categoryIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح بالوصول." };
  }

  if (!UUID_REGEX.test(seriesId)) {
    return { ok: false, error: "معرف المسلسل غير صالح." };
  }

  const delRes = await executeAdminWrite(
    "series_categories",
    "DELETE",
    undefined,
    `?series_id=eq.${seriesId}`
  );

  if (!delRes.ok) {
    return { ok: false, error: "تعذر تحديث تصنيفات المسلسل." };
  }

  if (categoryIds.length === 0) {
    return { ok: true };
  }

  const rows = categoryIds.map((catId, index) => ({
    series_id: seriesId,
    category_id: catId,
    is_primary: index === 0,
  }));

  const insertRes = await executeAdminWrite(
    "series_categories",
    "POST",
    rows,
    "?on_conflict=series_id,category_id",
    "resolution=merge-duplicates,return=minimal"
  );

  if (!insertRes.ok) {
    return { ok: false, error: "تم حفظ المسلسل ولكن تعذر ربط التصنيفات." };
  }

  return { ok: true };
}

/**
 * Creates a series record in public.series
 */
export async function createAdminSeriesRecord(
  payload: ValidatedSeriesPayload
): Promise<{ ok: true; series: DbSeriesRow } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  const { category_ids, ...seriesFields } = payload;
  const insertBody = {
    ...seriesFields,
    published_at: payload.status === "published" ? new Date().toISOString() : null,
  };

  const writeRes = await executeAdminWrite<DbSeriesRow[]>(
    "series",
    "POST",
    insertBody
  );

  if (!writeRes.ok || !writeRes.data || writeRes.data.length === 0) {
    return {
      ok: false,
      error: !writeRes.ok ? writeRes.error : "تعذر إنشاء المسلسل في قاعدة البيانات.",
    };
  }

  const created = writeRes.data[0];
  const syncRes = await syncSeriesCategories(created.id, category_ids);
  if (!syncRes.ok) {
    return { ok: false, error: syncRes.error ?? "تعذر ربط التصنيفات." };
  }

  return { ok: true, series: created };
}

/**
 * Updates a series record in public.series
 */
export async function updateAdminSeriesRecord(
  seriesId: string,
  payload: ValidatedSeriesPayload
): Promise<{ ok: true; series: DbSeriesRow } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  if (!UUID_REGEX.test(seriesId)) {
    return { ok: false, error: "معرف المسلسل غير صالح." };
  }

  const prevRead = await executeAdminRead<
    Array<{ poster_url: string | null; backdrop_url: string | null }>
  >("series", `?select=poster_url,backdrop_url&id=eq.${seriesId}&limit=1`);
  const prevRow = prevRead.ok ? prevRead.data[0] : undefined;

  const { category_ids, ...seriesFields } = payload;
  const updateBody: Record<string, unknown> = {
    ...seriesFields,
  };
  if (payload.status === "published") {
    updateBody.published_at = new Date().toISOString();
  } else if (payload.status === "draft") {
    updateBody.published_at = null;
  }

  const writeRes = await executeAdminWrite<DbSeriesRow[]>(
    "series",
    "PATCH",
    updateBody,
    `?id=eq.${seriesId}`
  );

  if (!writeRes.ok || !writeRes.data || writeRes.data.length === 0) {
    return {
      ok: false,
      error: !writeRes.ok ? writeRes.error : "لم يتم العثور على المسلسل لتحديثه.",
    };
  }

  const updated = writeRes.data[0];

  if (prevRow?.poster_url && prevRow.poster_url !== updated.poster_url) {
    await deleteStorageImageIfOwnedAndUnused(prevRow.poster_url);
  }
  if (prevRow?.backdrop_url && prevRow.backdrop_url !== updated.backdrop_url) {
    await deleteStorageImageIfOwnedAndUnused(prevRow.backdrop_url);
  }

  const syncRes = await syncSeriesCategories(updated.id, category_ids);
  if (!syncRes.ok) {
    return { ok: false, error: syncRes.error ?? "تعذر تحديث التصنيفات." };
  }

  return { ok: true, series: updated };
}

/**
 * Deletes a series record and cascades to seasons, episodes, and categories.
 */
export async function deleteAdminSeriesRecord(
  seriesId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  if (!UUID_REGEX.test(seriesId)) {
    return { ok: false, error: "معرف المسلسل غير صالح." };
  }

  const prevRead = await executeAdminRead<
    Array<{ poster_url: string | null; backdrop_url: string | null }>
  >("series", `?select=poster_url,backdrop_url&id=eq.${seriesId}&limit=1`);
  const prevRow = prevRead.ok ? prevRead.data[0] : undefined;

  const delRes = await executeAdminWrite(
    "series",
    "DELETE",
    undefined,
    `?id=eq.${seriesId}`
  );

  if (!delRes.ok) {
    return { ok: false, error: delRes.error };
  }

  if (prevRow?.poster_url) {
    await deleteStorageImageIfOwnedAndUnused(prevRow.poster_url);
  }
  if (prevRow?.backdrop_url) {
    await deleteStorageImageIfOwnedAndUnused(prevRow.backdrop_url);
  }

  return { ok: true };
}

// ==========================================
// SEASONS CRUD
// ==========================================

export async function createAdminSeasonRecord(
  payload: ValidatedSeasonPayload
): Promise<{ ok: true; season: DbSeasonRow } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  // Check for duplicate season_number in the same series
  const checkRes = await executeAdminRead<Array<{ id: string }>>(
    "seasons",
    `?select=id&series_id=eq.${payload.series_id}&season_number=eq.${payload.season_number}&limit=1`
  );
  if (checkRes.ok && checkRes.data.length > 0) {
    return {
      ok: false,
      error: `الموسم رقم (${payload.season_number}) موجود بالفعل في هذا المسلسل.`,
    };
  }

  const insertBody = {
    ...payload,
    published_at: payload.status === "published" ? new Date().toISOString() : null,
  };

  const writeRes = await executeAdminWrite<DbSeasonRow[]>(
    "seasons",
    "POST",
    insertBody
  );

  if (!writeRes.ok || !writeRes.data || writeRes.data.length === 0) {
    return {
      ok: false,
      error: !writeRes.ok ? writeRes.error : "تعذر إنشاء الموسم في قاعدة البيانات.",
    };
  }

  return { ok: true, season: writeRes.data[0] };
}

export async function updateAdminSeasonRecord(
  seasonId: string,
  payload: ValidatedSeasonPayload
): Promise<{ ok: true; season: DbSeasonRow } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  if (!UUID_REGEX.test(seasonId)) {
    return { ok: false, error: "معرف الموسم غير صالح." };
  }

  // Check for duplicate season_number in the same series excluding this season
  const checkRes = await executeAdminRead<Array<{ id: string }>>(
    "seasons",
    `?select=id&series_id=eq.${payload.series_id}&season_number=eq.${payload.season_number}&id=neq.${seasonId}&limit=1`
  );
  if (checkRes.ok && checkRes.data.length > 0) {
    return {
      ok: false,
      error: `الموسم رقم (${payload.season_number}) مستخدم بالفعل في موسم آخر.`,
    };
  }

  const prevRead = await executeAdminRead<Array<{ poster_url: string | null }>>(
    "seasons",
    `?select=poster_url&id=eq.${seasonId}&limit=1`
  );
  const prevRow = prevRead.ok ? prevRead.data[0] : undefined;

  const updateBody: Record<string, unknown> = {
    ...payload,
  };
  if (payload.status === "published") {
    updateBody.published_at = new Date().toISOString();
  } else if (payload.status === "draft") {
    updateBody.published_at = null;
  }

  const writeRes = await executeAdminWrite<DbSeasonRow[]>(
    "seasons",
    "PATCH",
    updateBody,
    `?id=eq.${seasonId}`
  );

  if (!writeRes.ok || !writeRes.data || writeRes.data.length === 0) {
    return {
      ok: false,
      error: !writeRes.ok ? writeRes.error : "تعذر تحديث الموسم.",
    };
  }

  const updated = writeRes.data[0];
  if (prevRow?.poster_url && prevRow.poster_url !== updated.poster_url) {
    await deleteStorageImageIfOwnedAndUnused(prevRow.poster_url);
  }

  return { ok: true, season: updated };
}

export async function deleteAdminSeasonRecord(
  seasonId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  if (!UUID_REGEX.test(seasonId)) {
    return { ok: false, error: "معرف الموسم غير صالح." };
  }

  const prevRead = await executeAdminRead<Array<{ poster_url: string | null }>>(
    "seasons",
    `?select=poster_url&id=eq.${seasonId}&limit=1`
  );
  const prevRow = prevRead.ok ? prevRead.data[0] : undefined;

  const delRes = await executeAdminWrite(
    "seasons",
    "DELETE",
    undefined,
    `?id=eq.${seasonId}`
  );

  if (!delRes.ok) {
    return { ok: false, error: delRes.error };
  }

  if (prevRow?.poster_url) {
    await deleteStorageImageIfOwnedAndUnused(prevRow.poster_url);
  }

  return { ok: true };
}

export async function reorderSeasons(
  seriesId: string,
  seasonIdsInOrder: string[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح." };
  }

  if (!UUID_REGEX.test(seriesId)) {
    return { ok: false, error: "معرف المسلسل غير صالح." };
  }

  // To avoid unique constraint violation on (series_id, season_number),
  // we first offset them, then set the final sequential order.
  for (let i = 0; i < seasonIdsInOrder.length; i++) {
    const id = seasonIdsInOrder[i];
    await executeAdminWrite(
      "seasons",
      "PATCH",
      { season_number: 1000 + i + 1 },
      `?id=eq.${id}&series_id=eq.${seriesId}`
    );
  }

  for (let i = 0; i < seasonIdsInOrder.length; i++) {
    const id = seasonIdsInOrder[i];
    const res = await executeAdminWrite(
      "seasons",
      "PATCH",
      { season_number: i + 1 },
      `?id=eq.${id}&series_id=eq.${seriesId}`
    );
    if (!res.ok) {
      return { ok: false, error: "تعذر إعادة ترتيب بعض المواسم." };
    }
  }

  return { ok: true };
}

// ==========================================
// EPISODES CRUD
// ==========================================

export async function createAdminEpisodeRecord(
  payload: ValidatedEpisodePayload
): Promise<{ ok: true; episode: DbEpisodeRow } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  // Check for duplicate episode_number in the same season
  const checkRes = await executeAdminRead<Array<{ id: string }>>(
    "episodes",
    `?select=id&season_id=eq.${payload.season_id}&episode_number=eq.${payload.episode_number}&limit=1`
  );
  if (checkRes.ok && checkRes.data.length > 0) {
    return {
      ok: false,
      error: `الحلقة رقم (${payload.episode_number}) موجودة بالفعل في هذا الموسم.`,
    };
  }

  const insertBody = {
    ...payload,
    published_at: payload.status === "published" ? new Date().toISOString() : null,
  };

  const writeRes = await executeAdminWrite<DbEpisodeRow[]>(
    "episodes",
    "POST",
    insertBody
  );

  if (!writeRes.ok || !writeRes.data || writeRes.data.length === 0) {
    return {
      ok: false,
      error: !writeRes.ok ? writeRes.error : "تعذر إنشاء الحلقة في قاعدة البيانات.",
    };
  }

  return { ok: true, episode: writeRes.data[0] };
}

export async function updateAdminEpisodeRecord(
  episodeId: string,
  payload: ValidatedEpisodePayload
): Promise<{ ok: true; episode: DbEpisodeRow } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  if (!UUID_REGEX.test(episodeId)) {
    return { ok: false, error: "معرف الحلقة غير صالح." };
  }

  // Check for duplicate episode_number in the same season excluding this episode
  const checkRes = await executeAdminRead<Array<{ id: string }>>(
    "episodes",
    `?select=id&season_id=eq.${payload.season_id}&episode_number=eq.${payload.episode_number}&id=neq.${episodeId}&limit=1`
  );
  if (checkRes.ok && checkRes.data.length > 0) {
    return {
      ok: false,
      error: `الحلقة رقم (${payload.episode_number}) مستخدمة بالفعل في حلقة أخرى.`,
    };
  }

  const prevRead = await executeAdminRead<Array<{ still_url: string | null }>>(
    "episodes",
    `?select=still_url&id=eq.${episodeId}&limit=1`
  );
  const prevRow = prevRead.ok ? prevRead.data[0] : undefined;

  const updateBody: Record<string, unknown> = {
    ...payload,
  };
  if (payload.status === "published") {
    updateBody.published_at = new Date().toISOString();
  } else if (payload.status === "draft") {
    updateBody.published_at = null;
  }

  const writeRes = await executeAdminWrite<DbEpisodeRow[]>(
    "episodes",
    "PATCH",
    updateBody,
    `?id=eq.${episodeId}`
  );

  if (!writeRes.ok || !writeRes.data || writeRes.data.length === 0) {
    return {
      ok: false,
      error: !writeRes.ok ? writeRes.error : "تعذر تحديث الحلقة.",
    };
  }

  const updated = writeRes.data[0];
  if (prevRow?.still_url && prevRow.still_url !== updated.still_url) {
    await deleteStorageImageIfOwnedAndUnused(prevRow.still_url);
  }

  return { ok: true, episode: updated };
}

export async function deleteAdminEpisodeRecord(
  episodeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  if (!UUID_REGEX.test(episodeId)) {
    return { ok: false, error: "معرف الحلقة غير صالح." };
  }

  const prevRead = await executeAdminRead<Array<{ still_url: string | null }>>(
    "episodes",
    `?select=still_url&id=eq.${episodeId}&limit=1`
  );
  const prevRow = prevRead.ok ? prevRead.data[0] : undefined;

  const delRes = await executeAdminWrite(
    "episodes",
    "DELETE",
    undefined,
    `?id=eq.${episodeId}`
  );

  if (!delRes.ok) {
    return { ok: false, error: delRes.error };
  }

  if (prevRow?.still_url) {
    await deleteStorageImageIfOwnedAndUnused(prevRow.still_url);
  }

  return { ok: true };
}

export async function reorderEpisodes(
  seasonId: string,
  episodeIdsInOrder: string[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح." };
  }

  if (!UUID_REGEX.test(seasonId)) {
    return { ok: false, error: "معرف الموسم غير صالح." };
  }

  // To avoid unique constraint violation on (season_id, episode_number),
  // we first offset them, then set the final sequential order.
  for (let i = 0; i < episodeIdsInOrder.length; i++) {
    const id = episodeIdsInOrder[i];
    await executeAdminWrite(
      "episodes",
      "PATCH",
      { episode_number: 10000 + i + 1 },
      `?id=eq.${id}&season_id=eq.${seasonId}`
    );
  }

  for (let i = 0; i < episodeIdsInOrder.length; i++) {
    const id = episodeIdsInOrder[i];
    const res = await executeAdminWrite(
      "episodes",
      "PATCH",
      { episode_number: i + 1 },
      `?id=eq.${id}&season_id=eq.${seasonId}`
    );
    if (!res.ok) {
      return { ok: false, error: "تعذر إعادة ترتيب بعض الحلقات." };
    }
  }

  return { ok: true };
}
