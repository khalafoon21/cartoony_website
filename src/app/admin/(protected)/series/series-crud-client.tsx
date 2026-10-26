"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { uploadMovieImage } from "@/lib/upload-movie-image";
import {
  deleteEpisodeAction,
  deleteSeasonAction,
  deleteSeriesAction,
  loadSeriesDetailsAction,
  reorderEpisodesAction,
  reorderSeasonsAction,
  saveEpisodeAction,
  saveSeasonAction,
  saveSeriesAction,
  toggleSeriesPublishStatusAction,
} from "./actions";
import { AdminDataOriginBadge } from "@/components/admin-dashboard-widgets";
import { AdminVideoSourceManager } from "@/components/admin-video-source-manager";
import { Icon } from "@/components/icon";
import type { VideoServer } from "@/lib/video-helpers";
import type {
  ArtThemeType,
  AudioBadgeType,
  DbCategoryRow,
  PublicationStatus,
} from "@/lib/movies-admin";
import type {
  DbEpisodeRow,
  DbSeasonRow,
  DbSeriesRow,
} from "@/lib/series-admin";

type StatusFilter = "all" | "published" | "draft" | "archived";

type UploadStatusState = {
  uploading: boolean;
  progress: number;
  message: string | null;
  type: "success" | "error" | null;
  tempUploadedUrl: string | null;
};

const INITIAL_UPLOAD_STATE: UploadStatusState = {
  uploading: false,
  progress: 0,
  message: null,
  type: null,
  tempUploadedUrl: null,
};

const MAX_CLIENT_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CLIENT_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

type SeriesFormValues = {
  series_id: string;
  title_ar: string;
  subtitle_ar: string;
  title_original: string;
  franchise_ar: string;
  slug: string;
  description_ar: string;
  release_year: string;
  rating: string;
  age_rating: string;
  audio_badge: AudioBadgeType;
  status: PublicationStatus;
  poster_url: string;
  backdrop_url: string;
  theme: ArtThemeType;
  accent_color: string;
  is_featured: boolean;
  is_most_watched: boolean;
  is_recently_added: boolean;
  category_ids: string[];
};

const EMPTY_SERIES_FORM: SeriesFormValues = {
  series_id: "",
  title_ar: "",
  subtitle_ar: "",
  title_original: "",
  franchise_ar: "",
  slug: "",
  description_ar: "",
  release_year: "2026",
  rating: "8.5",
  age_rating: "6+",
  audio_badge: "dubbed",
  status: "draft",
  poster_url: "",
  backdrop_url: "",
  theme: "desert",
  accent_color: "#F5A623",
  is_featured: false,
  is_most_watched: false,
  is_recently_added: true,
  category_ids: [],
};

type SeasonFormValues = {
  season_id: string;
  series_id: string;
  season_number: string;
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar: string;
  poster_url: string;
  release_year: string;
  status: PublicationStatus;
};

const EMPTY_SEASON_FORM: SeasonFormValues = {
  season_id: "",
  series_id: "",
  season_number: "1",
  slug: "",
  title_ar: "الموسم الأول",
  title_original: "Season 1",
  description_ar: "",
  poster_url: "",
  release_year: "2026",
  status: "published",
};

type EpisodeFormValues = {
  episode_id: string;
  series_id: string;
  season_id: string;
  season_number: number;
  episode_number: string;
  slug: string;
  title_ar: string;
  title_original: string;
  description_ar: string;
  still_url: string;
  duration_minutes: string;
  audio_badge: AudioBadgeType;
  video_url: string;
  video_type: "direct" | "iframe";
  servers: VideoServer[];
  subtitle_url: string;
  subtitle_lang: string;
  status: PublicationStatus;
};

const EMPTY_EPISODE_FORM: EpisodeFormValues = {
  episode_id: "",
  series_id: "",
  season_id: "",
  season_number: 1,
  episode_number: "1",
  slug: "",
  title_ar: "الحلقة 1",
  title_original: "Episode 1",
  description_ar: "",
  still_url: "",
  duration_minutes: "22",
  audio_badge: "dubbed",
  video_url: "",
  video_type: "iframe",
  servers: [],
  subtitle_url: "",
  subtitle_lang: "ar",
  status: "published",
};

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SeriesCrudClient({
  initialSeries,
  categories,
  dbError,
}: {
  initialSeries: DbSeriesRow[];
  categories: DbCategoryRow[];
  dbError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(dbError ? { type: "error", text: dbError } : null);

  // Series Form State
  const [isSeriesFormOpen, setIsSeriesFormOpen] = useState(false);
  const [seriesFormValues, setSeriesFormValues] =
    useState<SeriesFormValues>(EMPTY_SERIES_FORM);
  const [seriesPosterUpload, setSeriesPosterUpload] =
    useState<UploadStatusState>(INITIAL_UPLOAD_STATE);
  const [seriesBackdropUpload, setSeriesBackdropUpload] =
    useState<UploadStatusState>(INITIAL_UPLOAD_STATE);
  const [seriesToDelete, setSeriesToDelete] = useState<DbSeriesRow | null>(null);

  // Seasons & Episodes Workspace State
  const [activeSeries, setActiveSeries] = useState<DbSeriesRow | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Season Modal State
  const [isSeasonFormOpen, setIsSeasonFormOpen] = useState(false);
  const [seasonFormValues, setSeasonFormValues] =
    useState<SeasonFormValues>(EMPTY_SEASON_FORM);
  const [seasonPosterUpload, setSeasonPosterUpload] =
    useState<UploadStatusState>(INITIAL_UPLOAD_STATE);
  const [seasonToDelete, setSeasonToDelete] = useState<DbSeasonRow | null>(null);

  // Episode Modal State
  const [isEpisodeFormOpen, setIsEpisodeFormOpen] = useState(false);
  const [episodeFormValues, setEpisodeFormValues] =
    useState<EpisodeFormValues>(EMPTY_EPISODE_FORM);
  const [episodeStillUpload, setEpisodeStillUpload] =
    useState<UploadStatusState>(INITIAL_UPLOAD_STATE);
  const [episodeToDelete, setEpisodeToDelete] = useState<DbEpisodeRow | null>(null);

  // Dialog Refs
  const seriesDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const seasonDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const episodeDeleteDialogRef = useRef<HTMLDialogElement>(null);

  // File Input Refs
  const seriesPosterFileInputRef = useRef<HTMLInputElement>(null);
  const seriesBackdropFileInputRef = useRef<HTMLInputElement>(null);
  const seasonPosterFileInputRef = useRef<HTMLInputElement>(null);
  const episodeStillFileInputRef = useRef<HTMLInputElement>(null);

  // Filter series
  const filteredSeries = initialSeries.filter((series) => {
    if (statusFilter !== "all" && series.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      series.title_ar.toLowerCase().includes(q) ||
      series.title_original.toLowerCase().includes(q) ||
      series.slug.toLowerCase().includes(q)
    );
  });

  // Counts
  const totalCount = initialSeries.length;
  const publishedCount = initialSeries.filter((s) => s.status === "published").length;
  const draftCount = initialSeries.filter((s) => s.status === "draft").length;

  // Refresh active series details after changes
  async function refreshActiveSeries(seriesId: string) {
    setIsLoadingDetails(true);
    const res = await loadSeriesDetailsAction(seriesId);
    setIsLoadingDetails(false);
    if (res.ok && res.data) {
      setActiveSeries(res.data);
      if (res.data.seasons && res.data.seasons.length > 0) {
        if (!activeSeasonId || !res.data.seasons.some((s) => s.id === activeSeasonId)) {
          setActiveSeasonId(res.data.seasons[0].id);
        }
      } else {
        setActiveSeasonId(null);
      }
    }
  }

  // ==========================================
  // Image Upload Handler
  // ==========================================
  async function handleImageUpload(
    kind: "poster" | "backdrop",
    file: File,
    slugHint: string,
    setUploadState: React.Dispatch<React.SetStateAction<UploadStatusState>>,
    onSuccessUrl: (url: string) => void
  ) {
    if (!ALLOWED_CLIENT_MIMES.has(file.type)) {
      setUploadState({
        uploading: false,
        progress: 0,
        message: "الملف غير مدعوم. اختر صورة بصيغة JPEG أو PNG أو WebP.",
        type: "error",
        tempUploadedUrl: null,
      });
      return;
    }
    if (file.size > MAX_CLIENT_FILE_BYTES) {
      setUploadState({
        uploading: false,
        progress: 0,
        message: "حجم الصورة يتجاوز الحد الأقصى المسموح (5 ميجابايت).",
        type: "error",
        tempUploadedUrl: null,
      });
      return;
    }

    setUploadState({
      uploading: true,
      progress: 5,
      message: "جاري تهيئة الرفع إلى التخزين...",
      type: null,
      tempUploadedUrl: null,
    });

    try {
      const publicUrl = await uploadMovieImage(
        file,
        kind,
        slugHint || "series-image",
        (prog) => {
          setUploadState((prev) => ({
            ...prev,
            progress: prog,
            message: `جاري الرفع (${prog}%)...`,
          }));
        }
      );

      setUploadState({
        uploading: false,
        progress: 100,
        message: "تم رفع الصورة وحفظها بنجاح.",
        type: "success",
        tempUploadedUrl: publicUrl,
      });
      onSuccessUrl(publicUrl);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "تعذر رفع الصورة.";
      setUploadState({
        uploading: false,
        progress: 0,
        message: errMsg,
        type: "error",
        tempUploadedUrl: null,
      });
    }
  }

  // ==========================================
  // Series Handlers
  // ==========================================
  function openAddSeriesForm() {
    setSeriesFormValues(EMPTY_SERIES_FORM);
    setSeriesPosterUpload(INITIAL_UPLOAD_STATE);
    setSeriesBackdropUpload(INITIAL_UPLOAD_STATE);
    setIsSeriesFormOpen(true);
  }

  function openEditSeriesForm(series: DbSeriesRow) {
    const categoryIds = (series.series_categories ?? [])
      .map((sc) => sc.category_id)
      .filter(Boolean);

    setSeriesFormValues({
      series_id: series.id,
      title_ar: series.title_ar,
      subtitle_ar: series.subtitle_ar ?? "",
      title_original: series.title_original,
      franchise_ar: series.franchise_ar ?? "",
      slug: series.slug,
      description_ar: series.description_ar,
      release_year: String(series.release_year),
      rating: String(series.rating),
      age_rating: series.age_rating || "6+",
      audio_badge: series.audio_badge,
      status: series.status,
      poster_url: series.poster_url ?? "",
      backdrop_url: series.backdrop_url ?? "",
      theme: series.theme,
      accent_color: series.accent_color,
      is_featured: series.is_featured,
      is_most_watched: series.is_most_watched,
      is_recently_added: series.is_recently_added,
      category_ids: categoryIds,
    });
    setSeriesPosterUpload(INITIAL_UPLOAD_STATE);
    setSeriesBackdropUpload(INITIAL_UPLOAD_STATE);
    setIsSeriesFormOpen(true);
  }

  function handleSeriesSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) return;

    const formData = new FormData(formEl);
    setFeedback(null);

    startTransition(async () => {
      const result = await saveSeriesAction(formData);
      if (!result.ok) {
        setFeedback({
          type: "error",
          text: result.error ?? "حدث خطأ أثناء حفظ المسلسل.",
        });
        return;
      }

      setFeedback({
        type: "success",
        text: result.message ?? "تم حفظ المسلسل بنجاح.",
      });
      setIsSeriesFormOpen(false);
      router.refresh();
      if (activeSeries && result.data && activeSeries.id === result.data.id) {
        await refreshActiveSeries(result.data.id);
      }
    });
  }

  function handleToggleSeriesPublish(series: DbSeriesRow) {
    const nextStatus: "draft" | "published" =
      series.status === "published" ? "draft" : "published";
    setFeedback(null);

    startTransition(async () => {
      const res = await toggleSeriesPublishStatusAction(series.id, nextStatus);
      if (!res.ok) {
        setFeedback({ type: "error", text: res.error ?? "تعذر تغيير حالة النشر." });
        return;
      }
      setFeedback({ type: "success", text: res.message ?? "تم تحديث حالة النشر." });
      router.refresh();
      if (activeSeries && activeSeries.id === series.id) {
        await refreshActiveSeries(series.id);
      }
    });
  }

  function promptDeleteSeries(series: DbSeriesRow) {
    setSeriesToDelete(series);
    const dialog = seriesDeleteDialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  function confirmDeleteSeries() {
    if (!seriesToDelete) return;
    const targetId = seriesToDelete.id;
    const targetTitle = seriesToDelete.title_ar;

    startTransition(async () => {
      const res = await deleteSeriesAction(targetId);
      const dialog = seriesDeleteDialogRef.current;
      if (dialog && dialog.open) dialog.close();
      setSeriesToDelete(null);

      if (!res.ok) {
        setFeedback({ type: "error", text: res.error ?? "تعذر حذف المسلسل." });
        return;
      }

      setFeedback({
        type: "success",
        text: `تم حذف مسلسل «${targetTitle}» وجميع مواسمه وحلقاته بنجاح.`,
      });
      if (activeSeries?.id === targetId) {
        setActiveSeries(null);
      }
      if (seriesFormValues.series_id === targetId) {
        setIsSeriesFormOpen(false);
      }
      router.refresh();
    });
  }

  // ==========================================
  // Open Seasons/Episodes Workspace
  // ==========================================
  async function openSeasonsWorkspace(series: DbSeriesRow) {
    setActiveSeries(series);
    await refreshActiveSeries(series.id);
  }

  // ==========================================
  // Season Handlers
  // ==========================================
  function openAddSeasonModal() {
    if (!activeSeries) return;
    const currentSeasons = activeSeries.seasons ?? [];
    const nextSeasonNum =
      currentSeasons.length > 0
        ? Math.max(...currentSeasons.map((s) => s.season_number)) + 1
        : 1;

    setSeasonFormValues({
      season_id: "",
      series_id: activeSeries.id,
      season_number: String(nextSeasonNum),
      slug: `${activeSeries.slug}-season-${nextSeasonNum}`,
      title_ar: `الموسم ${nextSeasonNum}`,
      title_original: `Season ${nextSeasonNum}`,
      description_ar: "",
      poster_url: "",
      release_year: String(activeSeries.release_year),
      status: "published",
    });
    setSeasonPosterUpload(INITIAL_UPLOAD_STATE);
    setIsSeasonFormOpen(true);
  }

  function openEditSeasonModal(season: DbSeasonRow) {
    if (!activeSeries) return;
    setSeasonFormValues({
      season_id: season.id,
      series_id: season.series_id,
      season_number: String(season.season_number),
      slug: season.slug,
      title_ar: season.title_ar,
      title_original: season.title_original ?? "",
      description_ar: season.description_ar ?? "",
      poster_url: season.poster_url ?? "",
      release_year: season.release_year ? String(season.release_year) : "",
      status: season.status,
    });
    setSeasonPosterUpload(INITIAL_UPLOAD_STATE);
    setIsSeasonFormOpen(true);
  }

  function handleSeasonSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeSeries) return;
    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) return;

    const formData = new FormData(formEl);
    formData.set("series_slug", activeSeries.slug);
    setFeedback(null);

    startTransition(async () => {
      const result = await saveSeasonAction(formData);
      if (!result.ok) {
        setFeedback({ type: "error", text: result.error ?? "تعذر حفظ الموسم." });
        return;
      }
      setFeedback({ type: "success", text: result.message ?? "تم حفظ الموسم بنجاح." });
      setIsSeasonFormOpen(false);
      await refreshActiveSeries(activeSeries.id);
      router.refresh();
    });
  }

  function promptDeleteSeason(season: DbSeasonRow) {
    setSeasonToDelete(season);
    const dialog = seasonDeleteDialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  function confirmDeleteSeason() {
    if (!seasonToDelete || !activeSeries) return;
    const seasonId = seasonToDelete.id;

    startTransition(async () => {
      const res = await deleteSeasonAction(seasonId, activeSeries.slug);
      const dialog = seasonDeleteDialogRef.current;
      if (dialog && dialog.open) dialog.close();
      setSeasonToDelete(null);

      if (!res.ok) {
        setFeedback({ type: "error", text: res.error ?? "تعذر حذف الموسم." });
        return;
      }
      setFeedback({ type: "success", text: res.message ?? "تم حذف الموسم بنجاح." });
      await refreshActiveSeries(activeSeries.id);
      router.refresh();
    });
  }

  function handleMoveSeason(seasonIndex: number, direction: "up" | "down") {
    if (!activeSeries || !activeSeries.seasons) return;
    const seasons = [...activeSeries.seasons];
    const targetIndex = direction === "up" ? seasonIndex - 1 : seasonIndex + 1;
    if (targetIndex < 0 || targetIndex >= seasons.length) return;

    // Swap elements
    const temp = seasons[seasonIndex];
    seasons[seasonIndex] = seasons[targetIndex];
    seasons[targetIndex] = temp;

    const idsInOrder = seasons.map((s) => s.id);
    startTransition(async () => {
      const res = await reorderSeasonsAction(activeSeries.id, idsInOrder, activeSeries.slug);
      if (res.ok) {
        await refreshActiveSeries(activeSeries.id);
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error ?? "تعذر إعادة ترتيب المواسم." });
      }
    });
  }

  // ==========================================
  // Episode Handlers
  // ==========================================
  function openAddEpisodeModal(season: DbSeasonRow) {
    if (!activeSeries) return;
    const episodes = season.episodes ?? [];
    const nextEpisodeNum =
      episodes.length > 0
        ? Math.max(...episodes.map((e) => e.episode_number)) + 1
        : 1;

    setEpisodeFormValues({
      episode_id: "",
      series_id: activeSeries.id,
      season_id: season.id,
      season_number: season.season_number,
      episode_number: String(nextEpisodeNum),
      slug: `${activeSeries.slug}-s${season.season_number}-e${nextEpisodeNum}`,
      title_ar: `الحلقة ${nextEpisodeNum}`,
      title_original: `Episode ${nextEpisodeNum}`,
      description_ar: "",
      still_url: "",
      duration_minutes: "22",
      audio_badge: "dubbed",
      video_url: "",
      video_type: "iframe",
      servers: [],
      subtitle_url: "",
      subtitle_lang: "ar",
      status: "published",
    });
    setEpisodeStillUpload(INITIAL_UPLOAD_STATE);
    setIsEpisodeFormOpen(true);
  }

  function openEditEpisodeModal(episode: DbEpisodeRow, seasonNumber: number) {
    if (!activeSeries) return;
    const meta = (episode.metadata ?? {}) as {
      video_url?: string;
      video_type?: "direct" | "iframe";
      servers?: VideoServer[];
      subtitle_url?: string;
      subtitle_lang?: string;
    };

    const rawUrl = meta.video_url || "";
    const initialType: "direct" | "iframe" =
      meta.video_type === "direct" || meta.video_type === "iframe"
        ? meta.video_type
        : "iframe";
    const initialServers: VideoServer[] =
      Array.isArray(meta.servers) && meta.servers.length > 0
        ? meta.servers
        : rawUrl
        ? [{ id: "srv-1", name: "السيرفر الأساسي", url: rawUrl, type: initialType }]
        : [];

    setEpisodeFormValues({
      episode_id: episode.id,
      series_id: episode.series_id,
      season_id: episode.season_id,
      season_number: seasonNumber,
      episode_number: String(episode.episode_number),
      slug: episode.slug,
      title_ar: episode.title_ar,
      title_original: episode.title_original ?? "",
      description_ar: episode.description_ar ?? "",
      still_url: episode.still_url ?? "",
      duration_minutes: String(episode.duration_minutes),
      audio_badge: episode.audio_badge,
      video_url: rawUrl,
      video_type: initialType,
      servers: initialServers,
      subtitle_url: meta.subtitle_url || "",
      subtitle_lang: meta.subtitle_lang || "ar",
      status: episode.status,
    });
    setEpisodeStillUpload(INITIAL_UPLOAD_STATE);
    setIsEpisodeFormOpen(true);
  }

  function handleEpisodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeSeries) return;
    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) return;

    const formData = new FormData(formEl);
    formData.set("series_slug", activeSeries.slug);
    formData.set("season_number", String(episodeFormValues.season_number));
    setFeedback(null);

    startTransition(async () => {
      const result = await saveEpisodeAction(formData);
      if (!result.ok) {
        setFeedback({ type: "error", text: result.error ?? "تعذر حفظ الحلقة." });
        return;
      }
      setFeedback({ type: "success", text: result.message ?? "تم حفظ الحلقة بنجاح." });
      setIsEpisodeFormOpen(false);
      await refreshActiveSeries(activeSeries.id);
      router.refresh();
    });
  }

  function promptDeleteEpisode(episode: DbEpisodeRow) {
    setEpisodeToDelete(episode);
    const dialog = episodeDeleteDialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  function confirmDeleteEpisode() {
    if (!episodeToDelete || !activeSeries) return;
    const epId = episodeToDelete.id;

    startTransition(async () => {
      const res = await deleteEpisodeAction(epId, activeSeries.slug);
      const dialog = episodeDeleteDialogRef.current;
      if (dialog && dialog.open) dialog.close();
      setEpisodeToDelete(null);

      if (!res.ok) {
        setFeedback({ type: "error", text: res.error ?? "تعذر حذف الحلقة." });
        return;
      }
      setFeedback({ type: "success", text: res.message ?? "تم حذف الحلقة بنجاح." });
      await refreshActiveSeries(activeSeries.id);
      router.refresh();
    });
  }

  function handleMoveEpisode(
    season: DbSeasonRow,
    episodeIndex: number,
    direction: "up" | "down"
  ) {
    if (!activeSeries || !season.episodes) return;
    const episodes = [...season.episodes];
    const targetIndex = direction === "up" ? episodeIndex - 1 : episodeIndex + 1;
    if (targetIndex < 0 || targetIndex >= episodes.length) return;

    const temp = episodes[episodeIndex];
    episodes[episodeIndex] = episodes[targetIndex];
    episodes[targetIndex] = temp;

    const idsInOrder = episodes.map((e) => e.id);
    startTransition(async () => {
      const res = await reorderEpisodesAction(season.id, idsInOrder, activeSeries.slug);
      if (res.ok) {
        await refreshActiveSeries(activeSeries.id);
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error ?? "تعذر إعادة ترتيب الحلقات." });
      }
    });
  }

  // Active season object
  const currentSeason = (activeSeries?.seasons ?? []).find(
    (s) => s.id === activeSeasonId
  );

  return (
    <div className="admin-movies-crud">
      {/* Live Feedback Banner */}
      <div aria-live="polite" aria-atomic="true">
        {feedback && (
          <div
            className={`admin-feedback-banner is-${feedback.type}`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            <div className="admin-feedback-content">
              <span className="admin-feedback-icon" aria-hidden="true">
                <Icon
                  name={feedback.type === "success" ? "check" : "close"}
                  size={16}
                />
              </span>
              <p>{feedback.text}</p>
            </div>
            <button
              type="button"
              className="admin-feedback-dismiss"
              onClick={() => setFeedback(null)}
              aria-label="إغلاق التنبيه"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
      </div>

      {/* SERIES ADD / EDIT FORM MODAL */}
      {isSeriesFormOpen && (
        <section
          className="admin-crud-panel is-editing-form"
          aria-labelledby="series-form-heading"
        >
          <header className="admin-panel-heading">
            <div>
              <span className="eyebrow">
                {seriesFormValues.series_id ? "تعديل المسلسل" : "إضافة مسلسل جديد"}
              </span>
              <h2 id="series-form-heading">
                {seriesFormValues.series_id
                  ? `تعديل: ${seriesFormValues.title_ar}`
                  : "إضافة مسلسل كرتون جديد"}
                <span style={{ color: "var(--orange)" }}>.</span>
              </h2>
            </div>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => setIsSeriesFormOpen(false)}
            >
              <Icon name="close" size={16} />
              <span>إغلاق النموذج</span>
            </button>
          </header>

          <form onSubmit={handleSeriesSubmit} className="admin-movie-form">
            <input type="hidden" name="series_id" value={seriesFormValues.series_id} />

            <div className="admin-form-grid">
              {/* Arabic Title */}
              <div className="admin-form-field">
                <label htmlFor="field-series-title-ar">
                  العنوان بالعربية <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-series-title-ar"
                  name="title_ar"
                  type="text"
                  required
                  maxLength={200}
                  value={seriesFormValues.title_ar}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      title_ar: e.target.value,
                    }))
                  }
                  placeholder="مثال: مغامرات عدنان ولينا"
                />
              </div>

              {/* Subtitle */}
              <div className="admin-form-field">
                <label htmlFor="field-series-subtitle-ar">العنوان الفرعي بالعربية</label>
                <input
                  id="field-series-subtitle-ar"
                  name="subtitle_ar"
                  type="text"
                  maxLength={200}
                  value={seriesFormValues.subtitle_ar}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      subtitle_ar: e.target.value,
                    }))
                  }
                  placeholder="مثال: الجزء الأول"
                />
              </div>

              {/* Original Title */}
              <div className="admin-form-field">
                <label htmlFor="field-series-title-original">
                  العنوان الأصلي (بالإنجليزية) <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-series-title-original"
                  name="title_original"
                  type="text"
                  dir="ltr"
                  required
                  maxLength={200}
                  value={seriesFormValues.title_original}
                  onChange={(e) => {
                    const original = e.target.value;
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      title_original: original,
                      slug:
                        !prev.series_id && (!prev.slug || prev.slug === slugifyTitle(prev.title_original))
                          ? slugifyTitle(original)
                          : prev.slug,
                    }));
                  }}
                  placeholder="Future Boy Conan"
                />
              </div>

              {/* Slug */}
              <div className="admin-form-field">
                <div className="admin-label-row">
                  <label htmlFor="field-series-slug">
                    الرابط المختصر (Slug) <span className="admin-required-mark">*</span>
                  </label>
                  <button
                    type="button"
                    className="admin-inline-helper-btn"
                    onClick={() =>
                      setSeriesFormValues((prev) => ({
                        ...prev,
                        slug: slugifyTitle(prev.title_original || prev.slug),
                      }))
                    }
                  >
                    توليد تلقائي
                  </button>
                </div>
                <input
                  id="field-series-slug"
                  name="slug"
                  type="text"
                  dir="ltr"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  maxLength={120}
                  value={seriesFormValues.slug}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                  placeholder="future-boy-conan"
                />
              </div>

              {/* Franchise */}
              <div className="admin-form-field">
                <label htmlFor="field-series-franchise-ar">السلسلة / العالم</label>
                <input
                  id="field-series-franchise-ar"
                  name="franchise_ar"
                  type="text"
                  maxLength={150}
                  value={seriesFormValues.franchise_ar}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      franchise_ar: e.target.value,
                    }))
                  }
                  placeholder="مثال: عالم نيبون أنيميشن"
                />
              </div>

              {/* Release Year */}
              <div className="admin-form-field">
                <label htmlFor="field-series-year">
                  سنة الإصدار <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-series-year"
                  name="release_year"
                  type="number"
                  required
                  min={1920}
                  max={2100}
                  value={seriesFormValues.release_year}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      release_year: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Rating */}
              <div className="admin-form-field">
                <label htmlFor="field-series-rating">التقييم (0.0 إلى 10.0)</label>
                <input
                  id="field-series-rating"
                  name="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={seriesFormValues.rating}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      rating: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Age Rating */}
              <div className="admin-form-field">
                <label htmlFor="field-series-age">التصنيف العمري</label>
                <select
                  id="field-series-age"
                  name="age_rating"
                  value={seriesFormValues.age_rating}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      age_rating: e.target.value,
                    }))
                  }
                >
                  <option value="الكل">الكل (مناسب للجميع)</option>
                  <option value="6+">6+ (للأطفال)</option>
                  <option value="9+">9+ (للناشئة)</option>
                  <option value="12+">12+ (لليافعين)</option>
                  <option value="16+">16+ (للكبار)</option>
                </select>
              </div>

              {/* Audio Badge */}
              <div className="admin-form-field">
                <label htmlFor="field-series-audio">نوع الصوت</label>
                <select
                  id="field-series-audio"
                  name="audio_badge"
                  value={seriesFormValues.audio_badge}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      audio_badge: e.target.value as AudioBadgeType,
                    }))
                  }
                >
                  <option value="dubbed">مدبلج بالعربية</option>
                  <option value="subtitled">مترجم بالعربية</option>
                </select>
              </div>

              {/* Theme */}
              <div className="admin-form-field">
                <label htmlFor="field-series-theme">نمط الغلاف الفني (Theme)</label>
                <select
                  id="field-series-theme"
                  name="theme"
                  value={seriesFormValues.theme}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      theme: e.target.value as ArtThemeType,
                    }))
                  }
                >
                  <option value="desert">صحراء (Desert)</option>
                  <option value="forest">غابة (Forest)</option>
                  <option value="space">فضاء (Space)</option>
                  <option value="ocean">محيط (Ocean)</option>
                  <option value="sky">سماء (Sky)</option>
                </select>
              </div>

              {/* Status */}
              <div className="admin-form-field">
                <label htmlFor="field-series-status">حالة النشر</label>
                <select
                  id="field-series-status"
                  name="status"
                  value={seriesFormValues.status}
                  onChange={(e) =>
                    setSeriesFormValues((prev) => ({
                      ...prev,
                      status: e.target.value as PublicationStatus,
                    }))
                  }
                >
                  <option value="draft">مسودة (غير ظاهر للزوار)</option>
                  <option value="published">منشور للزوار</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="admin-form-field admin-field-full">
              <label htmlFor="field-series-description">
                وصف المسلسل بالعربية <span className="admin-required-mark">*</span>
              </label>
              <textarea
                id="field-series-description"
                name="description_ar"
                required
                rows={3}
                maxLength={2500}
                value={seriesFormValues.description_ar}
                onChange={(e) =>
                  setSeriesFormValues((prev) => ({
                    ...prev,
                    description_ar: e.target.value,
                  }))
                }
                placeholder="نبذة شيقة وموجزة عن قصة المسلسل..."
              />
            </div>

            {/* Artwork Uploads: Poster & Backdrop */}
            <div className="admin-artwork-uploads-grid">
              {/* Poster Card */}
              <div className="admin-artwork-card">
                <div className="admin-artwork-preview is-poster">
                  {seriesFormValues.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={seriesFormValues.poster_url} alt="معاينة الملصق" />
                  ) : (
                    <div className="admin-artwork-placeholder">
                      <Icon name="film" size={22} />
                      <span>معاينة الملصق</span>
                    </div>
                  )}
                </div>
                <div className="admin-artwork-controls">
                  <div className="admin-label-row">
                    <label htmlFor="field-series-poster-url">ملصق المسلسل (Poster)</label>
                    <span className="admin-field-hint">JPEG/PNG/WebP حتى 5MB</span>
                  </div>
                  <div className="admin-upload-btn-row">
                    <input
                      ref={seriesPosterFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="visually-hidden"
                      id="series-file-poster"
                      disabled={seriesPosterUpload.uploading || isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleImageUpload(
                            "poster",
                            file,
                            seriesFormValues.slug,
                            setSeriesPosterUpload,
                            (url) =>
                              setSeriesFormValues((prev) => ({
                                ...prev,
                                poster_url: url,
                              }))
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor="series-file-poster"
                      className={`admin-upload-trigger-btn ${
                        seriesPosterUpload.uploading ? "is-disabled" : ""
                      }`}
                    >
                      <Icon name="plus" size={14} />
                      <span>
                        {seriesPosterUpload.uploading
                          ? `جاري الرفع (${seriesPosterUpload.progress}%)...`
                          : seriesFormValues.poster_url
                          ? "استبدال الملصق"
                          : "رفع ملصق المسلسل"}
                      </span>
                    </label>
                    {seriesFormValues.poster_url && (
                      <button
                        type="button"
                        className="admin-inline-helper-btn"
                        onClick={() =>
                          setSeriesFormValues((prev) => ({ ...prev, poster_url: "" }))
                        }
                      >
                        مسح
                      </button>
                    )}
                  </div>
                  {seriesPosterUpload.message && (
                    <span
                      className={`admin-upload-status-note is-${seriesPosterUpload.type}`}
                    >
                      {seriesPosterUpload.message}
                    </span>
                  )}
                  <input
                    id="field-series-poster-url"
                    name="poster_url"
                    type="text"
                    dir="ltr"
                    value={seriesFormValues.poster_url}
                    onChange={(e) =>
                      setSeriesFormValues((prev) => ({
                        ...prev,
                        poster_url: e.target.value,
                      }))
                    }
                    placeholder="https://... أو /branding/..."
                  />
                </div>
              </div>

              {/* Backdrop Card */}
              <div className="admin-artwork-card">
                <div className="admin-artwork-preview is-backdrop">
                  {seriesFormValues.backdrop_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={seriesFormValues.backdrop_url} alt="معاينة الخلفية" />
                  ) : (
                    <div className="admin-artwork-placeholder">
                      <Icon name="film" size={22} />
                      <span>معاينة الخلفية العريضة</span>
                    </div>
                  )}
                </div>
                <div className="admin-artwork-controls">
                  <div className="admin-label-row">
                    <label htmlFor="field-series-backdrop-url">
                      خلفية المسلسل (Backdrop)
                    </label>
                    <span className="admin-field-hint">JPEG/PNG/WebP حتى 5MB</span>
                  </div>
                  <div className="admin-upload-btn-row">
                    <input
                      ref={seriesBackdropFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="visually-hidden"
                      id="series-file-backdrop"
                      disabled={seriesBackdropUpload.uploading || isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleImageUpload(
                            "backdrop",
                            file,
                            seriesFormValues.slug,
                            setSeriesBackdropUpload,
                            (url) =>
                              setSeriesFormValues((prev) => ({
                                ...prev,
                                backdrop_url: url,
                              }))
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor="series-file-backdrop"
                      className={`admin-upload-trigger-btn ${
                        seriesBackdropUpload.uploading ? "is-disabled" : ""
                      }`}
                    >
                      <Icon name="plus" size={14} />
                      <span>
                        {seriesBackdropUpload.uploading
                          ? `جاري الرفع (${seriesBackdropUpload.progress}%)...`
                          : seriesFormValues.backdrop_url
                          ? "استبدال الخلفية"
                          : "رفع خلفية المسلسل"}
                      </span>
                    </label>
                    {seriesFormValues.backdrop_url && (
                      <button
                        type="button"
                        className="admin-inline-helper-btn"
                        onClick={() =>
                          setSeriesFormValues((prev) => ({
                            ...prev,
                            backdrop_url: "",
                          }))
                        }
                      >
                        مسح
                      </button>
                    )}
                  </div>
                  {seriesBackdropUpload.message && (
                    <span
                      className={`admin-upload-status-note is-${seriesBackdropUpload.type}`}
                    >
                      {seriesBackdropUpload.message}
                    </span>
                  )}
                  <input
                    id="field-series-backdrop-url"
                    name="backdrop_url"
                    type="text"
                    dir="ltr"
                    value={seriesFormValues.backdrop_url}
                    onChange={(e) =>
                      setSeriesFormValues((prev) => ({
                        ...prev,
                        backdrop_url: e.target.value,
                      }))
                    }
                    placeholder="https://... أو /branding/..."
                  />
                </div>
              </div>
            </div>

            {/* Categories Selection */}
            <div className="admin-fieldset">
              <span className="admin-required-mark" style={{ fontWeight: 800 }}>
                تصنيفات المسلسل
              </span>
              <div className="admin-checkbox-grid">
                {categories.map((cat) => {
                  const isChecked = seriesFormValues.category_ids.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className={`admin-checkbox-card ${isChecked ? "is-checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        name="category_ids"
                        value={cat.id}
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSeriesFormValues((prev) => ({
                            ...prev,
                            category_ids: checked
                              ? [...prev.category_ids, cat.id]
                              : prev.category_ids.filter((id) => id !== cat.id),
                          }));
                        }}
                      />
                      <span>{cat.title_ar}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Flags */}
            <div className="admin-fieldset">
              <span style={{ fontWeight: 800 }}>مؤشرات العرض في الرئيسية</span>
              <div className="admin-checkbox-grid">
                <label className="admin-checkbox-card">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={seriesFormValues.is_featured}
                    onChange={(e) =>
                      setSeriesFormValues((prev) => ({
                        ...prev,
                        is_featured: e.target.checked,
                      }))
                    }
                  />
                  <span>مميز في شريط الهيرو (Hero)</span>
                </label>
                <label className="admin-checkbox-card">
                  <input
                    type="checkbox"
                    name="is_most_watched"
                    checked={seriesFormValues.is_most_watched}
                    onChange={(e) =>
                      setSeriesFormValues((prev) => ({
                        ...prev,
                        is_most_watched: e.target.checked,
                      }))
                    }
                  />
                  <span>الأكثر مشاهدة</span>
                </label>
                <label className="admin-checkbox-card">
                  <input
                    type="checkbox"
                    name="is_recently_added"
                    checked={seriesFormValues.is_recently_added}
                    onChange={(e) =>
                      setSeriesFormValues((prev) => ({
                        ...prev,
                        is_recently_added: e.target.checked,
                      }))
                    }
                  />
                  <span>أُضيف حديثاً</span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="admin-form-actions">
              <button
                type="submit"
                className="admin-primary-submit-btn"
                disabled={isPending}
              >
                <Icon name="check" size={16} />
                <span>
                  {isPending
                    ? "جاري الحفظ..."
                    : seriesFormValues.series_id
                    ? "تحديث المسلسل"
                    : "إضافة المسلسل"}
                </span>
              </button>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setIsSeriesFormOpen(false)}
              >
                إلغاء
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SEASONS & EPISODES DRAWER / WORKSPACE */}
      {activeSeries && (
        <section
          className="admin-crud-panel is-seasons-workspace"
          aria-labelledby="seasons-workspace-title"
        >
          <header className="admin-panel-heading">
            <div>
              <div className="admin-panel-title-row">
                <span className="eyebrow">إدارة المواسم والحلقات</span>
                <span className="admin-status-pill is-published">
                  {activeSeries.title_ar}
                </span>
              </div>
              <h2 id="seasons-workspace-title">
                مواسم وحلقات «{activeSeries.title_ar}»
                <span style={{ color: "var(--orange)" }}>.</span>
              </h2>
              <p className="section-note">
                إجمالي المواسم: {activeSeries.seasons?.length ?? 0} مواسم · أضف مواسم
                وحلقات ورتّبها بسهولة.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                className="admin-crud-action-btn is-enabled"
                onClick={openAddSeasonModal}
              >
                <Icon name="plus" size={16} />
                <span>إضافة موسم جديد</span>
              </button>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setActiveSeries(null)}
              >
                <Icon name="close" size={14} />
                <span>إغلاق</span>
              </button>
            </div>
          </header>

          {isLoadingDetails ? (
            <div className="admin-empty-state" style={{ padding: "40px 0" }}>
              <p>جاري تحميل مواسم وحلقات المسلسل...</p>
            </div>
          ) : !activeSeries.seasons || activeSeries.seasons.length === 0 ? (
            <div className="admin-empty-state">
              <Icon name="sparkles" size={36} />
              <h3>لا توجد مواسم لهذا المسلسل حتى الآن</h3>
              <p>ابدأ بإضافة الموسم الأول لتتمكن من إضافة الحلقات إليه.</p>
              <button
                type="button"
                className="admin-primary-submit-btn"
                style={{ marginTop: "14px" }}
                onClick={openAddSeasonModal}
              >
                <Icon name="plus" size={16} />
                <span>إضافة الموسم الأول</span>
              </button>
            </div>
          ) : (
            <div className="admin-seasons-container">
              {/* Season Tabs Strip */}
              <div className="admin-season-tabs" role="tablist">
                {activeSeries.seasons.map((season, idx) => {
                  const isActive = season.id === (activeSeasonId || activeSeries.seasons![0].id);
                  const epCount = season.episodes?.length ?? 0;
                  return (
                    <button
                      key={season.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`admin-season-tab ${isActive ? "is-active" : ""}`}
                      onClick={() => setActiveSeasonId(season.id)}
                    >
                      <strong>{season.title_ar}</strong>
                      <small>({epCount} حلقة)</small>
                    </button>
                  );
                })}
              </div>

              {/* Active Season Details and Episodes View */}
              {currentSeason && (
                <div className="admin-active-season-box">
                  <div className="admin-active-season-header">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h3 style={{ margin: 0, fontSize: "18px", color: "var(--cream)" }}>
                          {currentSeason.title_ar}
                        </h3>
                        <span
                          className={`admin-status-pill is-${currentSeason.status}`}
                        >
                          {currentSeason.status === "published" ? "منشور" : "مسودة"}
                        </span>
                        {currentSeason.release_year && (
                          <span className="admin-pill">{currentSeason.release_year}</span>
                        )}
                      </div>
                      {currentSeason.description_ar && (
                        <p
                          className="section-note"
                          style={{ margin: "6px 0 0", fontSize: "12px" }}
                        >
                          {currentSeason.description_ar}
                        </p>
                      )}
                    </div>

                    <div className="admin-season-actions-row">
                      {/* Move Season Up / Down */}
                      {(() => {
                        const seasonIndex = activeSeries.seasons!.findIndex(
                          (s) => s.id === currentSeason.id
                        );
                        return (
                          <>
                            <button
                              type="button"
                              className="admin-inline-action-btn"
                              title="تحريك الموسم للأعلى"
                              disabled={seasonIndex <= 0 || isPending}
                              onClick={() => handleMoveSeason(seasonIndex, "up")}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="admin-inline-action-btn"
                              title="تحريك الموسم للأسفل"
                              disabled={
                                seasonIndex >= activeSeries.seasons!.length - 1 || isPending
                              }
                              onClick={() => handleMoveSeason(seasonIndex, "down")}
                            >
                              ▼
                            </button>
                          </>
                        );
                      })()}

                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => openEditSeasonModal(currentSeason)}
                      >
                        <Icon name="pencil" size={14} />
                        <span>تعديل الموسم</span>
                      </button>

                      <button
                        type="button"
                        className="admin-danger-btn"
                        style={{ minHeight: "36px", padding: "0 12px" }}
                        onClick={() => promptDeleteSeason(currentSeason)}
                      >
                        <Icon name="trash" size={14} />
                        <span>حذف الموسم</span>
                      </button>

                      <button
                        type="button"
                        className="admin-crud-action-btn is-enabled"
                        style={{ minHeight: "36px", padding: "0 14px", fontSize: "12px" }}
                        onClick={() => openAddEpisodeModal(currentSeason)}
                      >
                        <Icon name="plus" size={14} />
                        <span>إضافة حلقة</span>
                      </button>
                    </div>
                  </div>

                  {/* Episodes Table / Cards */}
                  {!currentSeason.episodes || currentSeason.episodes.length === 0 ? (
                    <div className="admin-empty-state" style={{ padding: "30px 0" }}>
                      <p>لا توجد حلقات في هذا الموسم حتى الآن.</p>
                      <button
                        type="button"
                        className="admin-primary-submit-btn"
                        style={{ marginTop: "12px" }}
                        onClick={() => openAddEpisodeModal(currentSeason)}
                      >
                        <Icon name="plus" size={14} />
                        <span>إضافة أول حلقة</span>
                      </button>
                    </div>
                  ) : (
                    <div className="admin-table-wrap" style={{ marginTop: "14px" }}>
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: "60px" }}>
                              رقم
                            </th>
                            <th scope="col" style={{ width: "90px" }}>
                              المعاينة
                            </th>
                            <th scope="col">عنوان الحلقة</th>
                            <th scope="col">المدة</th>
                            <th scope="col">الصوت</th>
                            <th scope="col">الفيديو</th>
                            <th scope="col">الحالة</th>
                            <th scope="col" style={{ textAlign: "center" }}>
                              إجراءات
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSeason.episodes.map((ep, epIdx) => (
                            <tr key={ep.id}>
                              <td>
                                <strong style={{ color: "var(--orange)" }}>
                                  #{ep.episode_number}
                                </strong>
                              </td>
                              <td>
                                <div
                                  className="admin-movie-thumb"
                                  style={{ width: "72px", height: "42px" }}
                                >
                                  {ep.still_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={ep.still_url} alt={ep.title_ar} />
                                  ) : (
                                    <Icon name="sparkles" size={18} />
                                  )}
                                </div>
                              </td>
                              <td>
                                <strong>{ep.title_ar}</strong>
                                {ep.title_original && (
                                  <small dir="ltr" style={{ display: "block" }}>
                                    {ep.title_original}
                                  </small>
                                )}
                              </td>
                              <td>{ep.duration_minutes} دقيقة</td>
                              <td>
                                <span className="admin-pill">
                                  {ep.audio_badge === "subtitled" ? "مترجم" : "مدبلج"}
                                </span>
                              </td>
                              <td>
                                {ep.metadata?.video_url ? (
                                  <span
                                    className="admin-pill"
                                    style={{
                                      background: "rgba(72, 187, 120, 0.2)",
                                      color: "#81E6D9",
                                    }}
                                  >
                                    {(ep.metadata as any)?.video_type === "iframe"
                                      ? "تضمين Iframe"
                                      : Array.isArray((ep.metadata as any)?.servers) && (ep.metadata as any).servers.length > 1
                                      ? `${(ep.metadata as any).servers.length} سيرفرات`
                                      : "فيديو مباشر"}
                                  </span>
                                ) : (
                                  <span className="admin-field-hint">بدون فيديو</span>
                                )}
                              </td>
                              <td>
                                <span className={`admin-status-pill is-${ep.status}`}>
                                  {ep.status === "published" ? "منشور" : "مسودة"}
                                </span>
                              </td>
                              <td>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "6px",
                                    justifyContent: "center",
                                  }}
                                >
                                  {/* Reorder Episode */}
                                  <button
                                    type="button"
                                    className="admin-inline-action-btn"
                                    title="تحريك لأعلى"
                                    disabled={epIdx <= 0 || isPending}
                                    onClick={() =>
                                      handleMoveEpisode(currentSeason, epIdx, "up")
                                    }
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-inline-action-btn"
                                    title="تحريك لأسفل"
                                    disabled={
                                      epIdx >= currentSeason.episodes!.length - 1 ||
                                      isPending
                                    }
                                    onClick={() =>
                                      handleMoveEpisode(currentSeason, epIdx, "down")
                                    }
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-inline-action-btn"
                                    title="تعديل الحلقة"
                                    onClick={() =>
                                      openEditEpisodeModal(ep, currentSeason.season_number)
                                    }
                                  >
                                    <Icon name="pencil" size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-inline-action-btn is-delete"
                                    title="حذف الحلقة"
                                    onClick={() => promptDeleteEpisode(ep)}
                                  >
                                    <Icon name="trash" size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* SEASON ADD/EDIT MODAL */}
      {isSeasonFormOpen && activeSeries && (
        <section
          className="admin-crud-panel is-editing-form"
          style={{ maxWidth: "600px", margin: "0 auto" }}
        >
          <header className="admin-panel-heading">
            <div>
              <span className="eyebrow">
                {seasonFormValues.season_id ? "تعديل الموسم" : "موسم جديد"}
              </span>
              <h3>
                {seasonFormValues.season_id
                  ? `تعديل: ${seasonFormValues.title_ar}`
                  : `إضافة موسم جديد لمسلسل ${activeSeries.title_ar}`}
              </h3>
            </div>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => setIsSeasonFormOpen(false)}
            >
              <Icon name="close" size={14} />
            </button>
          </header>

          <form onSubmit={handleSeasonSubmit} className="admin-movie-form">
            <input type="hidden" name="season_id" value={seasonFormValues.season_id} />
            <input type="hidden" name="series_id" value={activeSeries.id} />

            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="field-season-num">
                  رقم الموسم <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-season-num"
                  name="season_number"
                  type="number"
                  required
                  min={1}
                  max={999}
                  value={seasonFormValues.season_number}
                  onChange={(e) => {
                    const num = e.target.value;
                    setSeasonFormValues((prev) => ({
                      ...prev,
                      season_number: num,
                      slug: `${activeSeries.slug}-season-${num}`,
                      title_ar: prev.title_ar.startsWith("الموسم")
                        ? `الموسم ${num}`
                        : prev.title_ar,
                    }));
                  }}
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-season-title-ar">العنوان بالعربية</label>
                <input
                  id="field-season-title-ar"
                  name="title_ar"
                  type="text"
                  required
                  value={seasonFormValues.title_ar}
                  onChange={(e) =>
                    setSeasonFormValues((prev) => ({
                      ...prev,
                      title_ar: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-season-title-orig">العنوان الأصلي (إنجليزي)</label>
                <input
                  id="field-season-title-orig"
                  name="title_original"
                  type="text"
                  dir="ltr"
                  value={seasonFormValues.title_original}
                  onChange={(e) =>
                    setSeasonFormValues((prev) => ({
                      ...prev,
                      title_original: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-season-slug">
                  الرابط المختصر (Slug) <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-season-slug"
                  name="slug"
                  type="text"
                  dir="ltr"
                  required
                  value={seasonFormValues.slug}
                  onChange={(e) =>
                    setSeasonFormValues((prev) => ({
                      ...prev,
                      slug: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-season-year">سنة إصدار الموسم</label>
                <input
                  id="field-season-year"
                  name="release_year"
                  type="number"
                  min={1920}
                  max={2100}
                  value={seasonFormValues.release_year}
                  onChange={(e) =>
                    setSeasonFormValues((prev) => ({
                      ...prev,
                      release_year: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-season-status">حالة الموسم</label>
                <select
                  id="field-season-status"
                  name="status"
                  value={seasonFormValues.status}
                  onChange={(e) =>
                    setSeasonFormValues((prev) => ({
                      ...prev,
                      status: e.target.value as PublicationStatus,
                    }))
                  }
                >
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                </select>
              </div>
            </div>

            <div className="admin-form-field admin-field-full">
              <label htmlFor="field-season-desc">وصف الموسم</label>
              <textarea
                id="field-season-desc"
                name="description_ar"
                rows={2}
                value={seasonFormValues.description_ar}
                onChange={(e) =>
                  setSeasonFormValues((prev) => ({
                    ...prev,
                    description_ar: e.target.value,
                  }))
                }
                placeholder="نبذة عن أحداث هذا الموسم..."
              />
            </div>

            {/* Poster Upload for Season */}
            <div className="admin-artwork-card">
              <div className="admin-artwork-controls" style={{ width: "100%" }}>
                <div className="admin-label-row">
                  <label htmlFor="field-season-poster">ملصق الموسم (اختياري)</label>
                </div>
                <div className="admin-upload-btn-row">
                  <input
                    ref={seasonPosterFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="visually-hidden"
                    id="season-file-poster"
                    disabled={seasonPosterUpload.uploading || isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleImageUpload(
                          "poster",
                          file,
                          seasonFormValues.slug,
                          setSeasonPosterUpload,
                          (url) =>
                            setSeasonFormValues((prev) => ({ ...prev, poster_url: url }))
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor="season-file-poster"
                    className="admin-upload-trigger-btn"
                  >
                    <Icon name="plus" size={14} />
                    <span>
                      {seasonPosterUpload.uploading
                        ? "جاري الرفع..."
                        : seasonFormValues.poster_url
                        ? "استبدال الملصق"
                        : "رفع ملصق للموسم"}
                    </span>
                  </label>
                  {seasonFormValues.poster_url && (
                    <button
                      type="button"
                      className="admin-inline-helper-btn"
                      onClick={() =>
                        setSeasonFormValues((prev) => ({ ...prev, poster_url: "" }))
                      }
                    >
                      مسح
                    </button>
                  )}
                </div>
                <input
                  id="field-season-poster"
                  name="poster_url"
                  type="text"
                  dir="ltr"
                  value={seasonFormValues.poster_url}
                  onChange={(e) =>
                    setSeasonFormValues((prev) => ({
                      ...prev,
                      poster_url: e.target.value,
                    }))
                  }
                  placeholder="رابط ملصق الموسم..."
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="submit"
                className="admin-primary-submit-btn"
                disabled={isPending}
              >
                <Icon name="check" size={16} />
                <span>{seasonFormValues.season_id ? "حفظ التعديلات" : "إضافة الموسم"}</span>
              </button>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setIsSeasonFormOpen(false)}
              >
                إلغاء
              </button>
            </div>
          </form>
        </section>
      )}

      {/* EPISODE ADD/EDIT MODAL */}
      {isEpisodeFormOpen && activeSeries && (
        <section
          className="admin-crud-panel is-editing-form"
          style={{ maxWidth: "600px", margin: "0 auto" }}
        >
          <header className="admin-panel-heading">
            <div>
              <span className="eyebrow">
                {episodeFormValues.episode_id ? "تعديل الحلقة" : "حلقة جديدة"}
              </span>
              <h3>
                {episodeFormValues.episode_id
                  ? `تعديل: ${episodeFormValues.title_ar}`
                  : `إضافة حلقة جديدة إلى الموسم ${episodeFormValues.season_number}`}
              </h3>
            </div>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => setIsEpisodeFormOpen(false)}
            >
              <Icon name="close" size={14} />
            </button>
          </header>

          <form onSubmit={handleEpisodeSubmit} className="admin-movie-form">
            <input type="hidden" name="episode_id" value={episodeFormValues.episode_id} />
            <input type="hidden" name="series_id" value={episodeFormValues.series_id} />
            <input type="hidden" name="season_id" value={episodeFormValues.season_id} />

            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="field-ep-num">
                  رقم الحلقة <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-ep-num"
                  name="episode_number"
                  type="number"
                  required
                  min={1}
                  max={9999}
                  value={episodeFormValues.episode_number}
                  onChange={(e) => {
                    const num = e.target.value;
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      episode_number: num,
                      slug: `${activeSeries.slug}-s${prev.season_number}-e${num}`,
                      title_ar: prev.title_ar.startsWith("الحلقة")
                        ? `الحلقة ${num}`
                        : prev.title_ar,
                    }));
                  }}
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-ep-title-ar">
                  عنوان الحلقة بالعربية <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-ep-title-ar"
                  name="title_ar"
                  type="text"
                  required
                  value={episodeFormValues.title_ar}
                  onChange={(e) =>
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      title_ar: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-ep-title-orig">العنوان الأصلي (إنجليزي)</label>
                <input
                  id="field-ep-title-orig"
                  name="title_original"
                  type="text"
                  dir="ltr"
                  value={episodeFormValues.title_original}
                  onChange={(e) =>
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      title_original: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-ep-slug">
                  الرابط المختصر (Slug) <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-ep-slug"
                  name="slug"
                  type="text"
                  dir="ltr"
                  required
                  value={episodeFormValues.slug}
                  onChange={(e) =>
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      slug: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-ep-duration">المدة (بالدقائق)</label>
                <input
                  id="field-ep-duration"
                  name="duration_minutes"
                  type="number"
                  min={1}
                  max={600}
                  value={episodeFormValues.duration_minutes}
                  onChange={(e) =>
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      duration_minutes: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-ep-audio">نوع الصوت</label>
                <select
                  id="field-ep-audio"
                  name="audio_badge"
                  value={episodeFormValues.audio_badge}
                  onChange={(e) =>
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      audio_badge: e.target.value as AudioBadgeType,
                    }))
                  }
                >
                  <option value="dubbed">مدبلج</option>
                  <option value="subtitled">مترجم</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="field-ep-status">الحالة</label>
                <select
                  id="field-ep-status"
                  name="status"
                  value={episodeFormValues.status}
                  onChange={(e) =>
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      status: e.target.value as PublicationStatus,
                    }))
                  }
                >
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                </select>
              </div>

              <div className="admin-form-field admin-field-full">
                <AdminVideoSourceManager
                  videoUrl={episodeFormValues.video_url}
                  videoType={episodeFormValues.video_type}
                  servers={episodeFormValues.servers}
                  subtitleUrl={episodeFormValues.subtitle_url}
                  subtitleLang={episodeFormValues.subtitle_lang}
                  onChange={(updates) =>
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      video_url: updates.video_url,
                      video_type: updates.video_type,
                      servers: updates.servers,
                      ...(updates.subtitle_url !== undefined ? { subtitle_url: updates.subtitle_url } : {}),
                      ...(updates.subtitle_lang !== undefined ? { subtitle_lang: updates.subtitle_lang } : {}),
                    }))
                  }
                />
              </div>
            </div>

            <div className="admin-form-field admin-field-full">
              <label htmlFor="field-ep-desc">ملخص أحداث الحلقة</label>
              <textarea
                id="field-ep-desc"
                name="description_ar"
                rows={2}
                value={episodeFormValues.description_ar}
                onChange={(e) =>
                  setEpisodeFormValues((prev) => ({
                    ...prev,
                    description_ar: e.target.value,
                  }))
                }
                placeholder="نبذة عن أحداث الحلقة..."
              />
            </div>

            {/* Episode Still / Thumbnail */}
            <div className="admin-artwork-card">
              <div className="admin-artwork-controls" style={{ width: "100%" }}>
                <div className="admin-label-row">
                  <label htmlFor="field-ep-still">صورة المعاينة (Still Thumbnail)</label>
                </div>
                <div className="admin-upload-btn-row">
                  <input
                    ref={episodeStillFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="visually-hidden"
                    id="ep-file-still"
                    disabled={episodeStillUpload.uploading || isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleImageUpload(
                          "backdrop",
                          file,
                          episodeFormValues.slug,
                          setEpisodeStillUpload,
                          (url) =>
                            setEpisodeFormValues((prev) => ({ ...prev, still_url: url }))
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor="ep-file-still"
                    className="admin-upload-trigger-btn"
                  >
                    <Icon name="plus" size={14} />
                    <span>
                      {episodeStillUpload.uploading
                        ? "جاري الرفع..."
                        : episodeFormValues.still_url
                        ? "استبدال صورة الحلقة"
                        : "رفع صورة للحلقة"}
                    </span>
                  </label>
                  {episodeFormValues.still_url && (
                    <button
                      type="button"
                      className="admin-inline-helper-btn"
                      onClick={() =>
                        setEpisodeFormValues((prev) => ({ ...prev, still_url: "" }))
                      }
                    >
                      مسح
                    </button>
                  )}
                </div>
                <input
                  id="field-ep-still"
                  name="still_url"
                  type="text"
                  dir="ltr"
                  value={episodeFormValues.still_url}
                  onChange={(e) =>
                    setEpisodeFormValues((prev) => ({
                      ...prev,
                      still_url: e.target.value,
                    }))
                  }
                  placeholder="رابط صورة الحلقة..."
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="submit"
                className="admin-primary-submit-btn"
                disabled={isPending}
              >
                <Icon name="check" size={16} />
                <span>{episodeFormValues.episode_id ? "حفظ التعديلات" : "إضافة الحلقة"}</span>
              </button>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setIsEpisodeFormOpen(false)}
              >
                إلغاء
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SERIES TABLE & TOOLBAR */}
      <section className="admin-crud-panel" aria-labelledby="series-table-title">
        <header className="admin-panel-heading">
          <div>
            <div className="admin-panel-title-row">
              <span className="eyebrow">قائمة مسلسلات الكرتون الحية</span>
              <AdminDataOriginBadge origin="database" />
            </div>
            <h2 id="series-table-title">
              المسلسلات المسجلة ({filteredSeries.length})
              <span style={{ color: "var(--orange)" }}>.</span>
            </h2>
          </div>

          <button
            type="button"
            className="admin-crud-action-btn is-enabled"
            onClick={openAddSeriesForm}
          >
            <Icon name="plus" size={16} />
            <span>إضافة مسلسل جديد</span>
          </button>
        </header>

        {/* Toolbar: Search and Filter Pills */}
        <div className="admin-movies-toolbar">
          <div className="admin-search-box">
            <span className="admin-search-icon" aria-hidden="true">
              <Icon name="search" size={16} />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعنوان أو الرابط المختصر..."
              aria-label="البحث في المسلسلات"
            />
          </div>

          <div className="admin-status-filters" role="tablist">
            <button
              type="button"
              className={`admin-filter-pill ${statusFilter === "all" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              الكل ({totalCount})
            </button>
            <button
              type="button"
              className={`admin-filter-pill ${
                statusFilter === "published" ? "is-active" : ""
              }`}
              onClick={() => setStatusFilter("published")}
            >
              المنشور ({publishedCount})
            </button>
            <button
              type="button"
              className={`admin-filter-pill ${
                statusFilter === "draft" ? "is-active" : ""
              }`}
              onClick={() => setStatusFilter("draft")}
            >
              المسودات ({draftCount})
            </button>
          </div>
        </div>

        {/* Series Table */}
        {filteredSeries.length === 0 ? (
          <div className="admin-empty-state">
            <Icon name="sparkles" size={36} />
            <h3>لا توجد مسلسلات مطابقة</h3>
            <p>جرّب تغيير عبارة البحث أو الفلتر، أو أضف مسلسلاً جديداً.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th scope="col">الملصق</th>
                  <th scope="col">المسلسل</th>
                  <th scope="col">السنة</th>
                  <th scope="col">المواسم</th>
                  <th scope="col">التصنيفات</th>
                  <th scope="col">الحالة</th>
                  <th scope="col" style={{ textAlign: "center" }}>
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSeries.map((series) => {
                  const seasonsCount = series.seasons?.length ?? 0;
                  const categoryLabels = (series.series_categories ?? [])
                    .map((sc) => sc.categories?.title_ar)
                    .filter(Boolean);

                  return (
                    <tr key={series.id}>
                      <td>
                        <div className="admin-movie-thumb">
                          {series.poster_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={series.poster_url} alt={series.title_ar} />
                          ) : (
                            <Icon name="sparkles" size={20} />
                          )}
                        </div>
                      </td>
                      <td>
                        <strong>{series.title_ar}</strong>
                        <small dir="ltr" style={{ display: "block" }}>
                          {series.title_original}
                        </small>
                      </td>
                      <td>{series.release_year}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-pill"
                          style={{
                            cursor: "pointer",
                            background: "rgba(245, 166, 35, 0.15)",
                            color: "var(--orange)",
                            border: "1px solid rgba(245, 166, 35, 0.3)",
                          }}
                          onClick={() => openSeasonsWorkspace(series)}
                          title="عرض وإدارة المواسم والحلقات"
                        >
                          <Icon name="sparkles" size={13} />
                          <span>{seasonsCount} مواسم</span>
                        </button>
                      </td>
                      <td>
                        {categoryLabels.length > 0 ? (
                          categoryLabels.join("، ")
                        ) : (
                          <span className="admin-field-hint">بدون تصنيف</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`admin-status-pill is-${series.status}`}
                          onClick={() => handleToggleSeriesPublish(series)}
                          title="انقر لتغيير حالة النشر"
                        >
                          {series.status === "published" ? "منشور" : "مسودة"}
                        </button>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            type="button"
                            className="admin-inline-action-btn"
                            style={{
                              padding: "4px 10px",
                              gap: "4px",
                              width: "auto",
                              fontSize: "11px",
                            }}
                            onClick={() => openSeasonsWorkspace(series)}
                            title="إدارة المواسم والحلقات"
                          >
                            <Icon name="sparkles" size={14} />
                            <span>المواسم والحلقات</span>
                          </button>
                          <button
                            type="button"
                            className="admin-inline-action-btn"
                            onClick={() => openEditSeriesForm(series)}
                            title="تعديل المسلسل"
                          >
                            <Icon name="pencil" size={14} />
                          </button>
                          <button
                            type="button"
                            className="admin-inline-action-btn is-delete"
                            onClick={() => promptDeleteSeries(series)}
                            title="حذف المسلسل"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SERIES DELETE CONFIRMATION DIALOG */}
      <dialog
        ref={seriesDeleteDialogRef}
        className="admin-dialog"
        aria-labelledby="delete-series-dialog-title"
      >
        <div className="admin-dialog-content">
          <h3 id="delete-series-dialog-title">تأكيد حذف المسلسل</h3>
          <p>
            هل أنت متأكد من رغبتك في حذف مسلسل «{seriesToDelete?.title_ar}»؟
            <br />
            <strong>تنبيه:</strong> سيتم حذف جميع مواسمه وحلقاته المرتبطة به نهائيًا.
          </p>
          <div className="admin-dialog-actions">
            <button
              type="button"
              className="admin-danger-btn"
              onClick={confirmDeleteSeries}
              disabled={isPending}
            >
              {isPending ? "جاري الحذف..." : "نعم، حذف نهائي"}
            </button>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => {
                seriesDeleteDialogRef.current?.close();
                setSeriesToDelete(null);
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </dialog>

      {/* SEASON DELETE CONFIRMATION DIALOG */}
      <dialog
        ref={seasonDeleteDialogRef}
        className="admin-dialog"
        aria-labelledby="delete-season-dialog-title"
      >
        <div className="admin-dialog-content">
          <h3 id="delete-season-dialog-title">تأكيد حذف الموسم</h3>
          <p>
            هل أنت متأكد من رغبتك في حذف «{seasonToDelete?.title_ar}»؟
            <br />
            <strong>تنبيه:</strong> سيتم حذف جميع حلقات هذا الموسم تلقائيًا.
          </p>
          <div className="admin-dialog-actions">
            <button
              type="button"
              className="admin-danger-btn"
              onClick={confirmDeleteSeason}
              disabled={isPending}
            >
              {isPending ? "جاري الحذف..." : "نعم، حذف الموسم"}
            </button>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => {
                seasonDeleteDialogRef.current?.close();
                setSeasonToDelete(null);
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </dialog>

      {/* EPISODE DELETE CONFIRMATION DIALOG */}
      <dialog
        ref={episodeDeleteDialogRef}
        className="admin-dialog"
        aria-labelledby="delete-episode-dialog-title"
      >
        <div className="admin-dialog-content">
          <h3 id="delete-episode-dialog-title">تأكيد حذف الحلقة</h3>
          <p>هل أنت متأكد من رغبتك في حذف «{episodeToDelete?.title_ar}»؟</p>
          <div className="admin-dialog-actions">
            <button
              type="button"
              className="admin-danger-btn"
              onClick={confirmDeleteEpisode}
              disabled={isPending}
            >
              {isPending ? "جاري الحذف..." : "نعم، حذف الحلقة"}
            </button>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => {
                episodeDeleteDialogRef.current?.close();
                setEpisodeToDelete(null);
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
