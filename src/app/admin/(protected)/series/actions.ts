"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import {
  createAdminEpisodeRecord,
  createAdminSeasonRecord,
  createAdminSeriesRecord,
  deleteAdminEpisodeRecord,
  deleteAdminSeasonRecord,
  deleteAdminSeriesRecord,
  getAdminSeriesWithDetails,
  reorderEpisodes,
  reorderSeasons,
  updateAdminEpisodeRecord,
  updateAdminSeasonRecord,
  updateAdminSeriesRecord,
  validateEpisodePayload,
  validateSeasonPayload,
  validateSeriesPayload,
  type DbSeriesRow,
} from "@/lib/series-admin";
import { executeAdminWrite } from "@/lib/supabase-server";

export type SeriesActionResult<T = unknown> = {
  ok: boolean;
  message?: string;
  error?: string;
  data?: T;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateSeriesRoutes(slug?: string) {
  revalidatePath("/");
  revalidatePath("/series");
  if (slug) {
    revalidatePath(`/series/${slug}`);
    revalidatePath(`/watch/series/${slug}`);
  }
  revalidatePath("/watch/series/[slug]/[episodeSlug]", "page");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/admin");
  revalidatePath("/admin/series");
}

export async function saveSeriesAction(formData: FormData): Promise<SeriesActionResult<DbSeriesRow>> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف. يرجى تسجيل الدخول مجددًا." };
  }

  const seriesId = String(formData.get("series_id") ?? "").trim();
  const categoryIds = formData
    .getAll("category_ids")
    .map((val) => String(val).trim())
    .filter(Boolean);

  const validation = validateSeriesPayload({
    slug: String(formData.get("slug") ?? ""),
    title_ar: String(formData.get("title_ar") ?? ""),
    subtitle_ar: String(formData.get("subtitle_ar") ?? ""),
    title_original: String(formData.get("title_original") ?? ""),
    franchise_ar: String(formData.get("franchise_ar") ?? ""),
    description_ar: String(formData.get("description_ar") ?? ""),
    poster_url: String(formData.get("poster_url") ?? ""),
    backdrop_url: String(formData.get("backdrop_url") ?? ""),
    release_year: String(formData.get("release_year") ?? ""),
    age_rating: String(formData.get("age_rating") ?? "6+"),
    rating: String(formData.get("rating") ?? "8.0"),
    audio_badge: String(formData.get("audio_badge") ?? "dubbed"),
    theme: String(formData.get("theme") ?? "desert"),
    accent_color: String(formData.get("accent_color") ?? "#F5A623"),
    is_featured: formData.get("is_featured") === "on",
    is_most_watched: formData.get("is_most_watched") === "on",
    is_recently_added: formData.get("is_recently_added") === "on",
    status: String(formData.get("status") ?? "draft"),
    category_ids: categoryIds,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  if (seriesId) {
    const updateRes = await updateAdminSeriesRecord(seriesId, validation.data);
    if (!updateRes.ok) {
      return { ok: false, error: updateRes.error };
    }
    revalidateSeriesRoutes(validation.data.slug);
    return {
      ok: true,
      message: `تم تحديث مسلسل «${validation.data.title_ar}» بنجاح.`,
      data: updateRes.series,
    };
  }

  const createRes = await createAdminSeriesRecord(validation.data);
  if (!createRes.ok) {
    return { ok: false, error: createRes.error };
  }

  revalidateSeriesRoutes(validation.data.slug);
  return {
    ok: true,
    message: `تمت إضافة مسلسل «${validation.data.title_ar}» إلى قاعدة البيانات بنجاح.`,
    data: createRes.series,
  };
}

export async function deleteSeriesAction(seriesId: string): Promise<SeriesActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const delRes = await deleteAdminSeriesRecord(seriesId);
  if (!delRes.ok) {
    return { ok: false, error: delRes.error };
  }

  revalidateSeriesRoutes();
  return { ok: true, message: "تم حذف المسلسل وجميع مواسمه وحلقاته بنجاح." };
}

export async function toggleSeriesPublishStatusAction(
  seriesId: string,
  nextStatus: "draft" | "published"
): Promise<SeriesActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  if (!UUID_REGEX.test(seriesId)) {
    return { ok: false, error: "معرف المسلسل غير صالح." };
  }

  if (nextStatus !== "draft" && nextStatus !== "published") {
    return { ok: false, error: "حالة النشر غير صالحة." };
  }

  const writeRes = await executeAdminWrite(
    "series",
    "PATCH",
    {
      status: nextStatus,
      published_at: nextStatus === "published" ? new Date().toISOString() : null,
    },
    `?id=eq.${seriesId}`
  );

  if (!writeRes.ok) {
    return { ok: false, error: writeRes.error };
  }

  revalidateSeriesRoutes();
  return {
    ok: true,
    message:
      nextStatus === "published"
        ? "تم نشر المسلسل ليصبح متاحًا للزوار."
        : "تم تحويل المسلسل إلى مسودة (غير ظاهر للزوار).",
  };
}

export async function loadSeriesDetailsAction(seriesId: string): Promise<SeriesActionResult<DbSeriesRow>> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const res = await getAdminSeriesWithDetails(seriesId);
  if (!res.ok || !res.series) {
    return { ok: false, error: res.error ?? "لم يتم العثور على المسلسل." };
  }

  return { ok: true, data: res.series };
}

// ==========================================
// SEASONS ACTIONS
// ==========================================

export async function saveSeasonAction(formData: FormData): Promise<SeriesActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const seasonId = String(formData.get("season_id") ?? "").trim();
  const seriesSlug = String(formData.get("series_slug") ?? "").trim();

  const validation = validateSeasonPayload(seriesSlug, {
    series_id: String(formData.get("series_id") ?? ""),
    season_number: String(formData.get("season_number") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    title_ar: String(formData.get("title_ar") ?? ""),
    title_original: String(formData.get("title_original") ?? ""),
    description_ar: String(formData.get("description_ar") ?? ""),
    poster_url: String(formData.get("poster_url") ?? ""),
    release_year: String(formData.get("release_year") ?? ""),
    status: String(formData.get("status") ?? "published"),
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  if (seasonId) {
    const updateRes = await updateAdminSeasonRecord(seasonId, validation.data);
    if (!updateRes.ok) {
      return { ok: false, error: updateRes.error };
    }
    revalidateSeriesRoutes(seriesSlug);
    return { ok: true, message: `تم تحديث «${validation.data.title_ar}» بنجاح.` };
  }

  const createRes = await createAdminSeasonRecord(validation.data);
  if (!createRes.ok) {
    return { ok: false, error: createRes.error };
  }

  revalidateSeriesRoutes(seriesSlug);
  return { ok: true, message: `تمت إضافة «${validation.data.title_ar}» بنجاح.` };
}

export async function deleteSeasonAction(seasonId: string, seriesSlug?: string): Promise<SeriesActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const delRes = await deleteAdminSeasonRecord(seasonId);
  if (!delRes.ok) {
    return { ok: false, error: delRes.error };
  }

  revalidateSeriesRoutes(seriesSlug);
  return { ok: true, message: "تم حذف الموسم وجميع حلقاته بنجاح." };
}

export async function reorderSeasonsAction(
  seriesId: string,
  seasonIdsInOrder: string[],
  seriesSlug?: string
): Promise<SeriesActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const reorderRes = await reorderSeasons(seriesId, seasonIdsInOrder);
  if (!reorderRes.ok) {
    return { ok: false, error: reorderRes.error };
  }

  revalidateSeriesRoutes(seriesSlug);
  return { ok: true, message: "تم تحديث ترتيب المواسم بنجاح." };
}

// ==========================================
// EPISODES ACTIONS
// ==========================================

export async function saveEpisodeAction(formData: FormData): Promise<SeriesActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const episodeId = String(formData.get("episode_id") ?? "").trim();
  const seriesSlug = String(formData.get("series_slug") ?? "").trim();
  const seasonNumber = Number.parseInt(String(formData.get("season_number") ?? "1"), 10) || 1;

  const validation = validateEpisodePayload(seriesSlug, seasonNumber, {
    series_id: String(formData.get("series_id") ?? ""),
    season_id: String(formData.get("season_id") ?? ""),
    episode_number: String(formData.get("episode_number") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    title_ar: String(formData.get("title_ar") ?? ""),
    title_original: String(formData.get("title_original") ?? ""),
    description_ar: String(formData.get("description_ar") ?? ""),
    still_url: String(formData.get("still_url") ?? ""),
    duration_minutes: String(formData.get("duration_minutes") ?? ""),
    audio_badge: String(formData.get("audio_badge") ?? "dubbed"),
    video_url: String(formData.get("video_url") ?? ""),
    subtitle_url: String(formData.get("subtitle_url") ?? ""),
    subtitle_lang: String(formData.get("subtitle_lang") ?? "ar"),
    status: String(formData.get("status") ?? "published"),
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  if (episodeId) {
    const updateRes = await updateAdminEpisodeRecord(episodeId, validation.data);
    if (!updateRes.ok) {
      return { ok: false, error: updateRes.error };
    }
    revalidateSeriesRoutes(seriesSlug);
    return { ok: true, message: `تم تحديث «${validation.data.title_ar}» بنجاح.` };
  }

  const createRes = await createAdminEpisodeRecord(validation.data);
  if (!createRes.ok) {
    return { ok: false, error: createRes.error };
  }

  revalidateSeriesRoutes(seriesSlug);
  return { ok: true, message: `تمت إضافة «${validation.data.title_ar}» بنجاح.` };
}

export async function deleteEpisodeAction(episodeId: string, seriesSlug?: string): Promise<SeriesActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const delRes = await deleteAdminEpisodeRecord(episodeId);
  if (!delRes.ok) {
    return { ok: false, error: delRes.error };
  }

  revalidateSeriesRoutes(seriesSlug);
  return { ok: true, message: "تم حذف الحلقة بنجاح." };
}

export async function reorderEpisodesAction(
  seasonId: string,
  episodeIdsInOrder: string[],
  seriesSlug?: string
): Promise<SeriesActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: انتهت جلسة المشرف." };
  }

  const reorderRes = await reorderEpisodes(seasonId, episodeIdsInOrder);
  if (!reorderRes.ok) {
    return { ok: false, error: reorderRes.error };
  }

  revalidateSeriesRoutes(seriesSlug);
  return { ok: true, message: "تم تحديث ترتيب الحلقات بنجاح." };
}
