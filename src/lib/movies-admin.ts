import "server-only";

import { getAdminSession } from "./admin-auth";
import { executeAdminRead, executeAdminWrite } from "./supabase-server";

export type PublicationStatus = "draft" | "published" | "archived";
export type AudioBadgeType = "dubbed" | "subtitled";
export type ArtThemeType = "forest" | "space" | "ocean" | "desert" | "sky";

export type DbCategoryRow = {
  id: string;
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar: string;
  icon_symbol: string;
  light_color: string;
  dark_color: string;
  display_order: number;
  status: PublicationStatus;
};

export type DbMovieCategoryJoin = {
  category_id: string;
  is_primary: boolean;
  categories?: {
    id: string;
    slug: string;
    title_ar: string;
  } | null;
};

export type DbMovieRow = {
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
  duration_minutes: number;
  duration_label_ar: string;
  age_rating: string;
  rating: number;
  audio_badge: AudioBadgeType;
  theme: ArtThemeType;
  accent_color: string;
  is_featured: boolean;
  is_most_watched: boolean;
  is_recently_added: boolean;
  status: PublicationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  movie_categories?: DbMovieCategoryJoin[];
};

export type ValidatedMoviePayload = {
  slug: string;
  title_ar: string;
  subtitle_ar: string;
  title_original: string;
  franchise_ar: string;
  description_ar: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_year: number;
  duration_minutes: number;
  duration_label_ar: string;
  age_rating: string;
  rating: number;
  audio_badge: AudioBadgeType;
  theme: ArtThemeType;
  accent_color: string;
  is_featured: boolean;
  is_most_watched: boolean;
  is_recently_added: boolean;
  status: PublicationStatus;
  category_ids: string[];
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_CATEGORIES_SEED = [
  {
    slug: "movies",
    title_ar: "أفلام",
    title_original: "Movies",
    description_ar: "سهرات سينمائية ممتعة",
    icon_symbol: "clapper",
    light_color: "#8A6D53",
    dark_color: "#3D3138",
    display_order: 1,
    status: "published",
  },
  {
    slug: "action",
    title_ar: "أكشن",
    title_original: "Action",
    description_ar: "حماس وإثارة بلا توقف",
    icon_symbol: "bolt",
    light_color: "#945B4F",
    dark_color: "#472D35",
    display_order: 2,
    status: "published",
  },
  {
    slug: "adventure",
    title_ar: "مغامرات",
    title_original: "Adventure",
    description_ar: "إلى عوالم جديدة",
    icon_symbol: "compass",
    light_color: "#676249",
    dark_color: "#2C3D3B",
    display_order: 3,
    status: "published",
  },
  {
    slug: "comedy",
    title_ar: "كوميديا",
    title_original: "Comedy",
    description_ar: "ضحكة من القلب",
    icon_symbol: "popcorn",
    light_color: "#975950",
    dark_color: "#4C3440",
    display_order: 4,
    status: "published",
  },
  {
    slug: "family",
    title_ar: "عائلي",
    title_original: "Family",
    description_ar: "لحظات تجمعنا",
    icon_symbol: "home",
    light_color: "#93696B",
    dark_color: "#4F394B",
    display_order: 5,
    status: "published",
  },
  {
    slug: "fantasy",
    title_ar: "خيال",
    title_original: "Fantasy",
    description_ar: "كل شيء ممكن",
    icon_symbol: "magic",
    light_color: "#64537E",
    dark_color: "#35344D",
    display_order: 6,
    status: "published",
  },
  {
    slug: "anime",
    title_ar: "أنمي",
    title_original: "Anime",
    description_ar: "روائع الرسوم اليابانية",
    icon_symbol: "anime",
    light_color: "#5E718A",
    dark_color: "#2E3A4E",
    display_order: 7,
    status: "published",
  },
];

function toArabicDigits(num: number): string {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num)
    .split("")
    .map((ch) => (ch >= "0" && ch <= "9" ? arabicDigits[Number(ch)] : ch))
    .join("");
}

export function formatArabicDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) {
    return `${toArabicDigits(mins)} دقيقة`;
  }
  const hrsLabel = hrs === 1 ? "١ ساعة" : hrs === 2 ? "ساعتان" : `${toArabicDigits(hrs)} ساعات`;
  if (mins === 0) return hrsLabel;
  return `${hrsLabel} و${toArabicDigits(mins)} دقيقة`;
}

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

export function validateMoviePayload(raw: {
  slug?: string;
  title_ar?: string;
  subtitle_ar?: string;
  title_original?: string;
  franchise_ar?: string;
  description_ar?: string;
  poster_url?: string;
  backdrop_url?: string;
  release_year?: string | number;
  duration_minutes?: string | number;
  duration_label_ar?: string;
  age_rating?: string;
  rating?: string | number;
  audio_badge?: string;
  theme?: string;
  accent_color?: string;
  is_featured?: boolean;
  is_most_watched?: boolean;
  is_recently_added?: boolean;
  status?: string;
  category_ids?: string[];
}): { ok: true; data: ValidatedMoviePayload } | { ok: false; error: string } {
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
      error: "الرابط المختصر (Slug) غير صالح: استخدم أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط (مثال: moon-forest).",
    };
  }

  const description_ar = String(raw.description_ar ?? "").trim();
  if (!description_ar || description_ar.length < 5 || description_ar.length > 2000) {
    return { ok: false, error: "وصف الفيلم بالعربية مطلوب (من 5 إلى 2000 حرف)." };
  }

  const subtitle_ar = String(raw.subtitle_ar ?? "").trim().slice(0, 200);
  const franchise_ar = String(raw.franchise_ar ?? "").trim().slice(0, 150) || title_ar;

  const release_year = Number.parseInt(String(raw.release_year ?? ""), 10);
  if (Number.isNaN(release_year) || release_year < 1920 || release_year > 2100) {
    return { ok: false, error: "سنة الإصدار يجب أن تكون بين 1920 و 2100." };
  }

  const duration_minutes = Number.parseInt(String(raw.duration_minutes ?? ""), 10);
  if (Number.isNaN(duration_minutes) || duration_minutes <= 0 || duration_minutes > 600) {
    return { ok: false, error: "مدة الفيلم بالدقائق يجب أن تكون رقماً موجباً (1 إلى 600 دقيقة)." };
  }

  const customDurationLabel = String(raw.duration_label_ar ?? "").trim().slice(0, 80);
  const duration_label_ar = customDurationLabel || formatArabicDuration(duration_minutes);

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
    return { ok: false, error: "رابط الملصق (Poster URL) غير صالح. يجب أن يبدأ بـ https:// أو /." };
  }
  const poster_url = rawPoster || null;

  const rawBackdrop = String(raw.backdrop_url ?? "").trim();
  if (rawBackdrop && !isValidUrlOrRelativePath(rawBackdrop)) {
    return { ok: false, error: "رابط الخلفية (Backdrop URL) غير صالح. يجب أن يبدأ بـ https:// أو /." };
  }
  const backdrop_url = rawBackdrop || null;

  const allowedThemes: ArtThemeType[] = ["forest", "space", "ocean", "desert", "sky"];
  const theme: ArtThemeType = allowedThemes.includes(raw.theme as ArtThemeType)
    ? (raw.theme as ArtThemeType)
    : "forest";

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
      duration_minutes,
      duration_label_ar,
      age_rating,
      rating,
      audio_badge,
      theme,
      accent_color,
      is_featured: Boolean(raw.is_featured),
      is_most_watched: Boolean(raw.is_most_watched),
      is_recently_added: Boolean(raw.is_recently_added),
      status,
      category_ids,
    },
  };
}

/**
 * Fetches categories for the admin workspace; automatically seeds the 7 standard
 * Cartoony categories if `public.categories` is empty so category relations work immediately.
 */
export async function getAdminCategories(): Promise<DbCategoryRow[]> {
  const session = await getAdminSession();
  if (!session) return [];

  const readRes = await executeAdminRead<DbCategoryRow[]>(
    "categories",
    "?select=*&order=display_order.asc"
  );

  if (!readRes.ok) return [];
  if (readRes.data.length > 0) {
    return readRes.data;
  }

  // Bootstrap default categories if the table is completely empty
  const seedRes = await executeAdminWrite<DbCategoryRow[]>(
    "categories",
    "POST",
    DEFAULT_CATEGORIES_SEED,
    "?on_conflict=slug",
    "resolution=merge-duplicates,return=representation"
  );

  if (seedRes.ok && Array.isArray(seedRes.data)) {
    return seedRes.data;
  }
  return [];
}

/**
 * Fetches all movies (draft, published, archived) with their linked categories.
 * Verifies admin session server-side before querying.
 */
export async function getAdminMovies(): Promise<{
  ok: boolean;
  error?: string;
  movies: DbMovieRow[];
}> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح بالوصول.", movies: [] };
  }

  const res = await executeAdminRead<DbMovieRow[]>(
    "movies",
    "?select=*,movie_categories(category_id,is_primary,categories(id,slug,title_ar))&order=created_at.desc"
  );

  if (!res.ok) {
    return { ok: false, error: res.error, movies: [] };
  }

  return { ok: true, movies: res.data };
}

/**
 * Replaces a movie's category relationships in `public.movie_categories`.
 */
export async function syncMovieCategories(
  movieId: string,
  categoryIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح بالوصول." };
  }

  if (!UUID_REGEX.test(movieId)) {
    return { ok: false, error: "معرف الفيلم غير صالح." };
  }

  const delRes = await executeAdminWrite(
    "movie_categories",
    "DELETE",
    undefined,
    `?movie_id=eq.${movieId}`
  );

  if (!delRes.ok) {
    return { ok: false, error: "تعذر تحديث تصنيفات الفيلم." };
  }

  if (categoryIds.length === 0) {
    return { ok: true };
  }

  const rows = categoryIds.map((catId, index) => ({
    movie_id: movieId,
    category_id: catId,
    is_primary: index === 0,
  }));

  const insertRes = await executeAdminWrite(
    "movie_categories",
    "POST",
    rows,
    "?on_conflict=movie_id,category_id",
    "resolution=merge-duplicates,return=minimal"
  );

  if (!insertRes.ok) {
    return { ok: false, error: "تم حفظ الفيلم ولكن تعذر ربط التصنيفات." };
  }

  return { ok: true };
}

export async function createAdminMovieRecord(
  payload: ValidatedMoviePayload
): Promise<{ ok: true; movie: DbMovieRow } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  const { category_ids, ...movieFields } = payload;
  const insertBody = {
    ...movieFields,
    published_at: payload.status === "published" ? new Date().toISOString() : null,
  };

  const writeRes = await executeAdminWrite<DbMovieRow[]>(
    "movies",
    "POST",
    insertBody
  );

  if (!writeRes.ok || !writeRes.data || writeRes.data.length === 0) {
    return {
      ok: false,
      error: !writeRes.ok ? writeRes.error : "تعذر إنشاء الفيلم في قاعدة البيانات.",
    };
  }

  const created = writeRes.data[0];
  const syncRes = await syncMovieCategories(created.id, category_ids);
  if (!syncRes.ok) {
    return { ok: false, error: syncRes.error ?? "تعذر ربط التصنيفات." };
  }

  return { ok: true, movie: created };
}

export async function updateAdminMovieRecord(
  movieId: string,
  payload: ValidatedMoviePayload
): Promise<{ ok: true; movie: DbMovieRow } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  if (!UUID_REGEX.test(movieId)) {
    return { ok: false, error: "معرف الفيلم غير صالح." };
  }

  const { category_ids, ...movieFields } = payload;
  const updateBody: Record<string, unknown> = {
    ...movieFields,
  };
  if (payload.status === "published") {
    updateBody.published_at = new Date().toISOString();
  } else if (payload.status === "draft") {
    updateBody.published_at = null;
  }

  const writeRes = await executeAdminWrite<DbMovieRow[]>(
    "movies",
    "PATCH",
    updateBody,
    `?id=eq.${movieId}`
  );

  if (!writeRes.ok || !writeRes.data || writeRes.data.length === 0) {
    return {
      ok: false,
      error: !writeRes.ok ? writeRes.error : "لم يتم العثور على الفيلم لتحديثه.",
    };
  }

  const updated = writeRes.data[0];
  const syncRes = await syncMovieCategories(updated.id, category_ids);
  if (!syncRes.ok) {
    return { ok: false, error: syncRes.error ?? "تعذر تحديث التصنيفات." };
  }

  return { ok: true, movie: updated };
}

export async function deleteAdminMovieRecord(
  movieId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يتطلب هذا الإجراء جلسة مشرف نشطة." };
  }

  if (!UUID_REGEX.test(movieId)) {
    return { ok: false, error: "معرف الفيلم غير صالح." };
  }

  const delRes = await executeAdminWrite(
    "movies",
    "DELETE",
    undefined,
    `?id=eq.${movieId}`
  );

  if (!delRes.ok) {
    return { ok: false, error: delRes.error };
  }

  return { ok: true };
}
