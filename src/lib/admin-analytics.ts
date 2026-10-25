import "server-only";

import { getAdminSession } from "./admin-auth";
import type { DbMovieRow } from "./movies-admin";
import { executeAdminRead, fetchTableExactCount } from "./supabase-server";

export type DailyActivityPoint = {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "25 أكتوبر"
  starts: number;
};

export type TopPlayedItem = {
  id: string;
  title: string;
  posterUrl: string | null;
  format: "movie" | "series";
  year: number;
  startsCount: number;
};

export type EpisodeStatItem = {
  id: string;
  title: string;
  episodeNumber: number;
  seriesId: string;
  seriesTitle?: string;
  startsCount: number;
};

export type PlaybackAnalyticsData = {
  totalStarts: number;
  last7DaysTotal: number;
  last30DaysTotal: number;
  dailyLast7Days: DailyActivityPoint[];
  dailyLast30Days: DailyActivityPoint[];
  topMovies: TopPlayedItem[];
  topSeries: TopPlayedItem[];
  topEpisodes: EpisodeStatItem[];
  hasData: boolean;
};

export type ContentHealthIssue = {
  id: string;
  title: string;
  type: "movie" | "series" | "episode";
  reason: "missing_poster" | "missing_video" | "draft_pending";
  reasonLabel: string;
  editHref: string;
};

export type ContentHealthReport = {
  missingPosters: ContentHealthIssue[];
  missingVideos: ContentHealthIssue[];
  pendingDrafts: ContentHealthIssue[];
  totalIssuesCount: number;
};

export type PlatformCounts = {
  moviesTotal: number;
  moviesPublished: number;
  moviesDraft: number;
  seriesTotal: number;
  seriesPublished: number;
  seriesDraft: number;
  seasonsTotal: number;
  seasonsPublished: number;
  seasonsDraft: number;
  episodesTotal: number;
  episodesPublished: number;
  episodesDraft: number;
  categoriesTotal: number;
};

export type RecentContentItem = {
  id: string;
  title: string;
  format: "movie" | "series";
  status: string;
  year: number;
  posterUrl: string | null;
  createdAt: string;
};

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

function formatArabicDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const day = Number.parseInt(parts[2], 10);
  const month = Number.parseInt(parts[1], 10) - 1;
  return `${day} ${ARABIC_MONTHS[month] || ""}`;
}

export async function getAdminPlatformCounts(): Promise<{
  ok: boolean;
  counts: PlatformCounts;
  recentItems: RecentContentItem[];
}> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      counts: {
        moviesTotal: 0, moviesPublished: 0, moviesDraft: 0,
        seriesTotal: 0, seriesPublished: 0, seriesDraft: 0,
        seasonsTotal: 0, seasonsPublished: 0, seasonsDraft: 0,
        episodesTotal: 0, episodesPublished: 0, episodesDraft: 0,
        categoriesTotal: 0,
      },
      recentItems: [],
    };
  }

  const [
    moviesRes,
    seriesRes,
    seasonsRes,
    episodesRes,
    categoriesCount,
  ] = await Promise.all([
    executeAdminRead<Array<{ id: string; title_ar: string; poster_url: string | null; release_year: number; status: string; created_at: string }>>(
      "movies",
      "?select=id,title_ar,poster_url,release_year,status,created_at&order=created_at.desc"
    ),
    executeAdminRead<Array<{ id: string; title_ar: string; poster_url: string | null; release_year: number; status: string; created_at: string }>>(
      "series",
      "?select=id,title_ar,poster_url,release_year,status,created_at&order=created_at.desc"
    ),
    executeAdminRead<Array<{ id: string; status: string }>>(
      "seasons",
      "?select=id,status"
    ),
    executeAdminRead<Array<{ id: string; status: string }>>(
      "episodes",
      "?select=id,status"
    ),
    fetchTableExactCount("categories", { useServiceRole: true }),
  ]);

  const movies = moviesRes.ok && Array.isArray(moviesRes.data) ? moviesRes.data : [];
  const series = seriesRes.ok && Array.isArray(seriesRes.data) ? seriesRes.data : [];
  const seasons = seasonsRes.ok && Array.isArray(seasonsRes.data) ? seasonsRes.data : [];
  const episodes = episodesRes.ok && Array.isArray(episodesRes.data) ? episodesRes.data : [];

  const moviesPublished = movies.filter((m) => m.status === "published").length;
  const seriesPublished = series.filter((s) => s.status === "published").length;
  const seasonsPublished = seasons.filter((s) => s.status === "published").length;
  const episodesPublished = episodes.filter((e) => e.status === "published").length;

  const counts: PlatformCounts = {
    moviesTotal: movies.length,
    moviesPublished,
    moviesDraft: movies.length - moviesPublished,
    seriesTotal: series.length,
    seriesPublished,
    seriesDraft: series.length - seriesPublished,
    seasonsTotal: seasons.length,
    seasonsPublished,
    seasonsDraft: seasons.length - seasonsPublished,
    episodesTotal: episodes.length,
    episodesPublished,
    episodesDraft: episodes.length - episodesPublished,
    categoriesTotal: categoriesCount ?? 0,
  };

  // Recent content items across movies and series
  const recentMovieItems: RecentContentItem[] = movies.map((m) => ({
    id: m.id,
    title: m.title_ar,
    format: "movie",
    status: m.status,
    year: m.release_year,
    posterUrl: m.poster_url,
    createdAt: m.created_at,
  }));

  const recentSeriesItems: RecentContentItem[] = series.map((s) => ({
    id: s.id,
    title: s.title_ar,
    format: "series",
    status: s.status,
    year: s.release_year,
    posterUrl: s.poster_url,
    createdAt: s.created_at,
  }));

  const recentItems = [...recentMovieItems, ...recentSeriesItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return { ok: true, counts, recentItems };
}

export async function getPlaybackAnalytics(): Promise<{
  ok: boolean;
  analytics: PlaybackAnalyticsData;
}> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      analytics: {
        totalStarts: 0,
        last7DaysTotal: 0,
        last30DaysTotal: 0,
        dailyLast7Days: [],
        dailyLast30Days: [],
        topMovies: [],
        topSeries: [],
        topEpisodes: [],
        hasData: false,
      },
    };
  }

  // 30 days cutoff
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [eventsRes, moviesRes, seriesRes, episodesRes] = await Promise.all([
    executeAdminRead<Array<{ content_type: string; content_id: string; series_id: string | null; created_at: string }>>(
      "playback_events",
      `?select=content_type,content_id,series_id,created_at&created_at=gte.${thirtyDaysAgoIso}&order=created_at.desc`
    ),
    executeAdminRead<Array<{ id: string; title_ar: string; poster_url: string | null; release_year: number }>>(
      "movies",
      "?select=id,title_ar,poster_url,release_year"
    ),
    executeAdminRead<Array<{ id: string; title_ar: string; poster_url: string | null; release_year: number }>>(
      "series",
      "?select=id,title_ar,poster_url,release_year"
    ),
    executeAdminRead<Array<{ id: string; title_ar: string; episode_number: number; series_id: string }>>(
      "episodes",
      "?select=id,title_ar,episode_number,series_id"
    ),
  ]);

  const events = eventsRes.ok && Array.isArray(eventsRes.data) ? eventsRes.data : [];
  const movieMap = new Map((moviesRes.ok && Array.isArray(moviesRes.data) ? moviesRes.data : []).map((m) => [m.id, m]));
  const seriesMap = new Map((seriesRes.ok && Array.isArray(seriesRes.data) ? seriesRes.data : []).map((s) => [s.id, s]));
  const episodeMap = new Map((episodesRes.ok && Array.isArray(episodesRes.data) ? episodesRes.data : []).map((e) => [e.id, e]));

  const totalStarts = events.length;
  const hasData = totalStarts > 0;

  // Aggregate by date
  const countsByDate = new Map<string, number>();
  for (const ev of events) {
    const day = ev.created_at.slice(0, 10); // YYYY-MM-DD
    countsByDate.set(day, (countsByDate.get(day) || 0) + 1);
  }

  // Build contiguous daily activity for last 30 days
  const dailyLast30Days: DailyActivityPoint[] = [];
  const dailyLast7Days: DailyActivityPoint[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayIso = d.toISOString().slice(0, 10);
    const starts = countsByDate.get(dayIso) || 0;
    const point: DailyActivityPoint = {
      date: dayIso,
      label: formatArabicDate(dayIso),
      starts,
    };
    dailyLast30Days.push(point);
    if (i < 7) {
      dailyLast7Days.push(point);
    }
  }

  const last7DaysTotal = dailyLast7Days.reduce((acc, curr) => acc + curr.starts, 0);
  const last30DaysTotal = dailyLast30Days.reduce((acc, curr) => acc + curr.starts, 0);

  // Top movies
  const movieCounts = new Map<string, number>();
  // Top series
  const seriesCounts = new Map<string, number>();
  // Top episodes
  const episodeCounts = new Map<string, number>();

  for (const ev of events) {
    if (ev.content_type === "movie") {
      movieCounts.set(ev.content_id, (movieCounts.get(ev.content_id) || 0) + 1);
    } else if (ev.content_type === "episode") {
      episodeCounts.set(ev.content_id, (episodeCounts.get(ev.content_id) || 0) + 1);
      if (ev.series_id) {
        seriesCounts.set(ev.series_id, (seriesCounts.get(ev.series_id) || 0) + 1);
      }
    }
  }

  const topMovies: TopPlayedItem[] = Array.from(movieCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([movieId, count]) => {
      const m = movieMap.get(movieId);
      return {
        id: movieId,
        title: m?.title_ar || "فيلم غير معروف",
        posterUrl: m?.poster_url || null,
        format: "movie",
        year: m?.release_year || 0,
        startsCount: count,
      };
    });

  const topSeries: TopPlayedItem[] = Array.from(seriesCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([seriesId, count]) => {
      const s = seriesMap.get(seriesId);
      return {
        id: seriesId,
        title: s?.title_ar || "مسلسل غير معروف",
        posterUrl: s?.poster_url || null,
        format: "series",
        year: s?.release_year || 0,
        startsCount: count,
      };
    });

  const topEpisodes: EpisodeStatItem[] = Array.from(episodeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([episodeId, count]) => {
      const ep = episodeMap.get(episodeId);
      const s = ep ? seriesMap.get(ep.series_id) : undefined;
      return {
        id: episodeId,
        title: ep?.title_ar || "حلقة غير معروفة",
        episodeNumber: ep?.episode_number || 1,
        seriesId: ep?.series_id || "",
        seriesTitle: s?.title_ar,
        startsCount: count,
      };
    });

  return {
    ok: true,
    analytics: {
      totalStarts,
      last7DaysTotal,
      last30DaysTotal,
      dailyLast7Days,
      dailyLast30Days,
      topMovies,
      topSeries,
      topEpisodes,
      hasData,
    },
  };
}

export async function getContentHealthReport(): Promise<{
  ok: boolean;
  report: ContentHealthReport;
}> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      report: {
        missingPosters: [],
        missingVideos: [],
        pendingDrafts: [],
        totalIssuesCount: 0,
      },
    };
  }

  const [moviesRes, seriesRes, episodesRes] = await Promise.all([
    executeAdminRead<Array<{ id: string; title_ar: string; poster_url: string | null; status: string; metadata: any }>>(
      "movies",
      "?select=id,title_ar,poster_url,status,metadata"
    ),
    executeAdminRead<Array<{ id: string; title_ar: string; poster_url: string | null; status: string }>>(
      "series",
      "?select=id,title_ar,poster_url,status"
    ),
    executeAdminRead<Array<{ id: string; title_ar: string; series_id: string; status: string; metadata: any }>>(
      "episodes",
      "?select=id,title_ar,series_id,status,metadata"
    ),
  ]);

  const movies = moviesRes.ok && Array.isArray(moviesRes.data) ? moviesRes.data : [];
  const series = seriesRes.ok && Array.isArray(seriesRes.data) ? seriesRes.data : [];
  const episodes = episodesRes.ok && Array.isArray(episodesRes.data) ? episodesRes.data : [];

  const missingPosters: ContentHealthIssue[] = [];
  const missingVideos: ContentHealthIssue[] = [];
  const pendingDrafts: ContentHealthIssue[] = [];

  // Check movies
  for (const m of movies) {
    if (!m.poster_url || m.poster_url.trim() === "") {
      missingPosters.push({
        id: m.id,
        title: m.title_ar,
        type: "movie",
        reason: "missing_poster",
        reasonLabel: "فيلم بدون ملصق (Poster)",
        editHref: `/admin/movies`,
      });
    }

    if (m.status === "published") {
      const videoUrl = typeof m.metadata?.video_url === "string" ? m.metadata.video_url.trim() : "";
      if (!videoUrl) {
        missingVideos.push({
          id: m.id,
          title: m.title_ar,
          type: "movie",
          reason: "missing_video",
          reasonLabel: "فيلم منشور بدون مصدر فيديو",
          editHref: `/admin/movies`,
        });
      }
    } else if (m.status === "draft") {
      pendingDrafts.push({
        id: m.id,
        title: m.title_ar,
        type: "movie",
        reason: "draft_pending",
        reasonLabel: "فيلم مسودة بانتظار المراجعة والنشر",
        editHref: `/admin/movies`,
      });
    }
  }

  // Check series
  for (const s of series) {
    if (!s.poster_url || s.poster_url.trim() === "") {
      missingPosters.push({
        id: s.id,
        title: s.title_ar,
        type: "series",
        reason: "missing_poster",
        reasonLabel: "مسلسل بدون ملصق (Poster)",
        editHref: `/admin/series`,
      });
    }

    if (s.status === "draft") {
      pendingDrafts.push({
        id: s.id,
        title: s.title_ar,
        type: "series",
        reason: "draft_pending",
        reasonLabel: "مسلسل مسودة بانتظار النشر",
        editHref: `/admin/series`,
      });
    }
  }

  // Check episodes
  for (const ep of episodes) {
    if (ep.status === "published") {
      const videoUrl = typeof ep.metadata?.video_url === "string" ? ep.metadata.video_url.trim() : "";
      if (!videoUrl) {
        missingVideos.push({
          id: ep.id,
          title: ep.title_ar,
          type: "episode",
          reason: "missing_video",
          reasonLabel: "حلقة منشورة بدون مصدر فيديو",
          editHref: `/admin/series`,
        });
      }
    } else if (ep.status === "draft") {
      pendingDrafts.push({
        id: ep.id,
        title: ep.title_ar,
        type: "episode",
        reason: "draft_pending",
        reasonLabel: "حلقة مسودة بانتظار النشر",
        editHref: `/admin/series`,
      });
    }
  }

  const totalIssuesCount = missingPosters.length + missingVideos.length + pendingDrafts.length;

  return {
    ok: true,
    report: {
      missingPosters,
      missingVideos,
      pendingDrafts,
      totalIssuesCount,
    },
  };
}
