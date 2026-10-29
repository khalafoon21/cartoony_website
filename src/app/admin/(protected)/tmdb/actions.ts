"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getTmdbMoviePreview,
  getTmdbSeasonEpisodes,
  getTmdbSeriesPreview,
  importTmdbMovie,
  importTmdbSeries,
  searchTmdb,
  type TmdbMoviePreview,
  type TmdbSearchResult,
  type TmdbSeriesPreview,
} from "@/lib/tmdb-service";

export type TmdbActionResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export async function searchTmdbAction(
  query: string,
  mediaType: "movie" | "tv" | "multi" = "multi",
  page = 1
): Promise<TmdbActionResult<{ results: TmdbSearchResult[]; total_results: number }>> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يلزم تسجيل دخول المشرف." };
  }

  const res = await searchTmdb(query, mediaType, page);
  if (!res.ok) {
    return { ok: false, error: res.error ?? "تعذر البحث في TMDB." };
  }

  return { ok: true, data: { results: res.results, total_results: res.total_results } };
}

export async function getTmdbMoviePreviewAction(
  tmdbId: number
): Promise<TmdbActionResult<TmdbMoviePreview>> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يلزم تسجيل دخول المشرف." };
  }

  const res = await getTmdbMoviePreview(tmdbId);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error ?? "تعذر جلب تفاصيل الفيلم." };
  }

  return { ok: true, data: res.data };
}

export async function getTmdbSeriesPreviewAction(
  tmdbId: number,
  includeSpecials = false
): Promise<TmdbActionResult<TmdbSeriesPreview>> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يلزم تسجيل دخول المشرف." };
  }

  const res = await getTmdbSeriesPreview(tmdbId, includeSpecials);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error ?? "تعذر جلب تفاصيل المسلسل." };
  }

  return { ok: true, data: res.data };
}

export async function getTmdbSeasonEpisodesAction(
  tmdbSeriesId: number,
  seasonNumber: number,
  existingSeriesId?: string
) {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يلزم تسجيل دخول المشرف." };
  }

  const res = await getTmdbSeasonEpisodes(tmdbSeriesId, seasonNumber, existingSeriesId);
  if (!res.ok) {
    return { ok: false, error: res.error ?? "تعذر جلب حلقات هذا الموسم." };
  }

  return { ok: true, data: res.episodes };
}

export async function importTmdbMovieAction(
  payload: Parameters<typeof importTmdbMovie>[0]
): Promise<TmdbActionResult<{ movieId: string }>> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يلزم تسجيل دخول المشرف." };
  }

  const res = await importTmdbMovie(payload);
  if (!res.ok || !res.movie_id) {
    return { ok: false, error: res.error ?? "فشل استيراد الفيلم." };
  }

  revalidatePath("/");
  revalidatePath("/movies");
  if (payload.slug) {
    revalidatePath(`/movies/${payload.slug}`);
    revalidatePath(`/watch/movies/${payload.slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/movies");

  return {
    ok: true,
    data: { movieId: res.movie_id },
    message: `تم استيراد فيلم «${payload.title_ar}» بنجاح كمسودة للمراجعة.`,
  };
}

export async function importTmdbSeriesAction(
  payload: Parameters<typeof importTmdbSeries>[0]
): Promise<TmdbActionResult<{ seriesId: string; seasonsCount: number; episodesCount: number }>> {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "غير مصرح: يلزم تسجيل دخول المشرف." };
  }

  const res = await importTmdbSeries(payload);
  if (!res.ok || !res.series_id) {
    return { ok: false, error: res.error ?? "فشل استيراد المسلسل." };
  }

  revalidatePath("/");
  revalidatePath("/series");
  if (payload.slug) {
    revalidatePath(`/series/${payload.slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/series");

  return {
    ok: true,
    data: {
      seriesId: res.series_id,
      seasonsCount: res.seasons_count,
      episodesCount: res.episodes_count,
    },
    message: `تم استيراد مسلسل «${payload.title_ar}» (${res.seasons_count} مواسم، ${res.episodes_count} حلقة) بنجاح.`,
  };
}
