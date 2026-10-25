"use client";

import { useRouter } from "next/navigation";
import { uploadMovieImage } from "@/lib/upload-movie-image";
import { useRef, useState, useTransition } from "react";
import {
  cleanupUnsavedUploadsAction,
  deleteMovieAction,
  saveMovieAction,
  toggleMoviePublishStatusAction,
} from "./actions";
import { AdminDataOriginBadge } from "@/components/admin-dashboard-widgets";
import { Icon } from "@/components/icon";
import type {
  AudioBadgeType,
  DbCategoryRow,
  DbMovieRow,
  PublicationStatus,
} from "@/lib/movies-admin";

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

type FormValues = {
  movie_id: string;
  title_ar: string;
  subtitle_ar: string;
  title_original: string;
  franchise_ar: string;
  slug: string;
  description_ar: string;
  release_year: string;
  duration_minutes: string;
  duration_label_ar: string;
  rating: string;
  age_rating: string;
  audio_badge: AudioBadgeType;
  status: PublicationStatus;
  poster_url: string;
  backdrop_url: string;
  theme: "forest" | "space" | "ocean" | "desert" | "sky";
  accent_color: string;
  is_featured: boolean;
  is_most_watched: boolean;
  is_recently_added: boolean;
  category_ids: string[];
  video_url: string;
  subtitle_url: string;
  subtitle_lang: string;
};

const EMPTY_FORM: FormValues = {
  movie_id: "",
  title_ar: "",
  subtitle_ar: "",
  title_original: "",
  franchise_ar: "",
  slug: "",
  description_ar: "",
  release_year: "2026",
  duration_minutes: "90",
  duration_label_ar: "",
  rating: "8.5",
  age_rating: "6+",
  audio_badge: "dubbed",
  status: "draft",
  poster_url: "",
  backdrop_url: "",
  theme: "forest",
  accent_color: "#F5A623",
  is_featured: false,
  is_most_watched: false,
  is_recently_added: true,
  category_ids: [],
  video_url: "",
  subtitle_url: "",
  subtitle_lang: "ar",
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

function mapMovieToForm(movie: DbMovieRow): FormValues {
  const categoryIds = (movie.movie_categories ?? [])
    .map((mc) => mc.category_id)
    .filter(Boolean);

  const meta = (movie.metadata ?? {}) as {
    video_url?: string;
    subtitle_url?: string;
    subtitle_lang?: string;
  };

  return {
    movie_id: movie.id,
    title_ar: movie.title_ar,
    subtitle_ar: movie.subtitle_ar ?? "",
    title_original: movie.title_original,
    franchise_ar: movie.franchise_ar ?? "",
    slug: movie.slug,
    description_ar: movie.description_ar,
    release_year: String(movie.release_year),
    duration_minutes: String(movie.duration_minutes),
    duration_label_ar: movie.duration_label_ar ?? "",
    rating: String(movie.rating),
    age_rating: movie.age_rating || "6+",
    audio_badge: movie.audio_badge,
    status: movie.status,
    poster_url: movie.poster_url ?? "",
    backdrop_url: movie.backdrop_url ?? "",
    theme: movie.theme || "forest",
    accent_color: movie.accent_color || "#F5A623",
    is_featured: Boolean(movie.is_featured),
    is_most_watched: Boolean(movie.is_most_watched),
    is_recently_added: Boolean(movie.is_recently_added),
    category_ids: categoryIds,
    video_url: meta.video_url || "",
    subtitle_url: meta.subtitle_url || "",
    subtitle_lang: meta.subtitle_lang || "ar",
  };
}

export function MoviesCrudClient({
  initialMovies,
  categories,
  dbError,
}: {
  initialMovies: DbMovieRow[];
  categories: DbCategoryRow[];
  dbError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);

  const [posterUpload, setPosterUpload] =
    useState<UploadStatusState>(INITIAL_UPLOAD_STATE);
  const [backdropUpload, setBackdropUpload] =
    useState<UploadStatusState>(INITIAL_UPLOAD_STATE);

  const posterFileInputRef = useRef<HTMLInputElement | null>(null);
  const backdropFileInputRef = useRef<HTMLInputElement | null>(null);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(dbError ? { type: "error", text: dbError } : null);

  const [movieToDelete, setMovieToDelete] = useState<DbMovieRow | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const filteredMovies = initialMovies.filter((movie) => {
    if (statusFilter !== "all" && movie.status !== statusFilter) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      movie.title_ar.toLowerCase().includes(q) ||
      movie.title_original.toLowerCase().includes(q) ||
      movie.slug.toLowerCase().includes(q) ||
      movie.description_ar.toLowerCase().includes(q)
    );
  });

  const publishedCount = initialMovies.filter((m) => m.status === "published").length;
  const draftCount = initialMovies.filter((m) => m.status === "draft").length;

  const isAnyUploading = posterUpload.uploading || backdropUpload.uploading;

  function resetUploadStates(cleanupTempFiles = false) {
    if (cleanupTempFiles) {
      const urlsToClean = [
        posterUpload.tempUploadedUrl,
        backdropUpload.tempUploadedUrl,
      ].filter((u): u is string => Boolean(u));
      if (urlsToClean.length > 0) {
        void cleanupUnsavedUploadsAction(urlsToClean, formValues.movie_id || undefined);
      }
    }
    setPosterUpload(INITIAL_UPLOAD_STATE);
    setBackdropUpload(INITIAL_UPLOAD_STATE);
    if (posterFileInputRef.current) posterFileInputRef.current.value = "";
    if (backdropFileInputRef.current) backdropFileInputRef.current.value = "";
  }

  function openCreateForm() {
    if (isAnyUploading || isPending) return;
    resetUploadStates(true);
    setFormValues({
      ...EMPTY_FORM,
      category_ids: categories[0] ? [categories[0].id] : [],
    });
    setFeedback(null);
    setIsFormOpen(true);
  }

  function openEditForm(movie: DbMovieRow) {
    if (isAnyUploading || isPending) return;
    resetUploadStates(true);
    setFormValues(mapMovieToForm(movie));
    setFeedback(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm(shouldCleanupUnsaved = true) {
    if (isAnyUploading) return;
    resetUploadStates(shouldCleanupUnsaved);
    setIsFormOpen(false);
    setFormValues(EMPTY_FORM);
  }

  async function handleArtworkFileSelect(
    kind: "poster" | "backdrop",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploadState = kind === "poster" ? setPosterUpload : setBackdropUpload;
    const currentUploadState = kind === "poster" ? posterUpload : backdropUpload;

    if (!ALLOWED_CLIENT_MIMES.has(file.type)) {
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        progress: 0,
        type: "error",
        message: "يُسمح فقط بصور JPEG أو PNG أو WebP.",
      }));
      e.target.value = "";
      return;
    }

    if (file.size <= 0 || file.size > MAX_CLIENT_FILE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        progress: 0,
        type: "error",
        message: `حجم الصورة (${sizeMb} ميجابايت) يتجاوز الحد الأقصى (5 ميجابايت).`,
      }));
      e.target.value = "";
      return;
    }

    setUploadState((prev) => ({ ...prev, uploading: true, progress: 5, type: null, message: "جاري رفع الصورة والتحقق منها..." }));
    try {
      const uploadedUrl = await uploadMovieImage(file, kind,
        formValues.slug || slugifyTitle(formValues.title_original) || "movie",
        (progress) => setUploadState((prev) => ({ ...prev, progress })));
      setFormValues((prev) => ({ ...prev, ...(kind === "poster" ? { poster_url: uploadedUrl } : { backdrop_url: uploadedUrl }) }));
      setUploadState({ uploading: false, progress: 100, type: "success",
        message: kind === "poster" ? "تم رفع صورة الملصق إلى Supabase Storage بنجاح." : "تم رفع صورة الخلفية إلى Supabase Storage بنجاح.",
        tempUploadedUrl: uploadedUrl });
      const otherArtworkUrl = kind === "poster" ? formValues.backdrop_url : formValues.poster_url;
      if (currentUploadState.tempUploadedUrl && currentUploadState.tempUploadedUrl !== otherArtworkUrl) {
        void cleanupUnsavedUploadsAction([currentUploadState.tempUploadedUrl]);
      }
    } catch (error) {
      setUploadState((prev) => ({ ...prev, uploading: false, progress: 0, type: "error",
        message: error instanceof Error ? error.message : "تعذر رفع الصورة. يرجى المحاولة مجددًا." }));
    } finally {
      const input = kind === "poster" ? posterFileInputRef.current : backdropFileInputRef.current;
      if (input) input.value = "";
    }
  }

  function toggleCategoryId(categoryId: string) {
    setFormValues((prev) => {
      const exists = prev.category_ids.includes(categoryId);
      return {
        ...prev,
        category_ids: exists
          ? prev.category_ids.filter((id) => id !== categoryId)
          : [...prev.category_ids, categoryId],
      };
    });
  }

  // Sync aria-invalid with native constraint validation on blur/input/submit
  function syncControlAriaInvalid(
    target: EventTarget | null
  ) {
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      if (target.hasAttribute("required")) {
        if (!target.checkValidity()) {
          target.setAttribute("aria-invalid", "true");
        } else {
          target.removeAttribute("aria-invalid");
        }
      }
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isAnyUploading) return;
    const formEl = e.currentTarget;

    // Sync aria-invalid across all required fields when submission is attempted
    const requiredControls = formEl.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("[required]");
    requiredControls.forEach((ctrl) => syncControlAriaInvalid(ctrl));

    if (!formEl.checkValidity()) {
      const firstInvalid = formEl.querySelector<HTMLElement>(":invalid");
      firstInvalid?.focus();
      return;
    }

    const formData = new FormData(formEl);
    setFeedback(null);

    startTransition(async () => {
      const result = await saveMovieAction(formData);
      if (!result.ok) {
        setFeedback({
          type: "error",
          text: result.error ?? "حدث خطأ أثناء حفظ الفيلم.",
        });
        return;
      }

      setFeedback({
        type: "success",
        text: result.message ?? "تم حفظ الفيلم بنجاح.",
      });
      // Saved images are protected by server-side reference checks; remove unused uploads.
      closeForm(true);
      router.refresh();
    });
  }

  function handleQuickStatusToggle(movie: DbMovieRow) {
    const nextStatus: "draft" | "published" =
      movie.status === "published" ? "draft" : "published";
    setFeedback(null);

    startTransition(async () => {
      const res = await toggleMoviePublishStatusAction(movie.id, nextStatus);
      if (!res.ok) {
        setFeedback({ type: "error", text: res.error ?? "تعذر تغيير حالة النشر." });
        return;
      }
      setFeedback({ type: "success", text: res.message ?? "تم تحديث حالة الفيلم." });
      router.refresh();
    });
  }

  function promptDeleteMovie(movie: DbMovieRow) {
    setMovieToDelete(movie);
    const dialog = deleteDialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  function cancelDeleteMovie() {
    const dialog = deleteDialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setMovieToDelete(null);
  }

  function confirmDeleteMovie() {
    if (!movieToDelete) return;
    const targetId = movieToDelete.id;
    const targetTitle = movieToDelete.title_ar;

    startTransition(async () => {
      const res = await deleteMovieAction(targetId);
      cancelDeleteMovie();

      if (!res.ok) {
        setFeedback({
          type: "error",
          text: res.error ?? "تعذر حذف الفيلم.",
        });
        return;
      }

      setFeedback({
        type: "success",
        text: `تم حذف فيلم «${targetTitle}» نهائيًا من قاعدة البيانات.`,
      });
      if (formValues.movie_id === targetId) {
        closeForm(false);
      }
      router.refresh();
    });
  }

  return (
    <div className="admin-movies-crud">
      {/* Live Status Banner */}
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

      {/* Add / Edit Movie Form Modal/Drawer Panel */}
      {isFormOpen && (
        <section
          className="admin-crud-panel admin-movie-form-panel"
          aria-labelledby="movie-form-heading"
        >
          <header className="admin-panel-heading">
            <div>
              <div className="admin-panel-title-row">
                <span className="eyebrow">
                  {formValues.movie_id ? "تعديل بيانات الفيلم" : "إضافة فيلم جديد"}
                </span>
                <AdminDataOriginBadge origin="database" />
              </div>
              <h2 id="movie-form-heading">
                {formValues.movie_id
                  ? `تعديل: ${formValues.title_ar}`
                  : "بيانات الفيلم الجديد"}
                <span style={{ color: "var(--orange)" }}>.</span>
              </h2>
              <p className="section-note">
                الحقول المميزة بعلامة (*) إلزامية ويتم التحقق منها في الخادم قبل الحفظ في Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={() => closeForm(true)}
              className="admin-secondary-btn"
            >
              <Icon name="close" size={15} />
              <span>إلغاء وإغلاق</span>
            </button>
          </header>

          <form
            ref={formRef}
            onSubmit={handleFormSubmit}
            onBlur={(e) => syncControlAriaInvalid(e.target)}
            onInput={(e) => {
              if (
                (e.target instanceof HTMLInputElement ||
                  e.target instanceof HTMLTextAreaElement) &&
                e.target.hasAttribute("aria-invalid") &&
                e.target.checkValidity()
              ) {
                e.target.removeAttribute("aria-invalid");
              }
            }}
            className="admin-movie-form"
            noValidate={false}
          >
            <input type="hidden" name="movie_id" value={formValues.movie_id} />

            <div className="admin-form-grid">
              {/* Arabic Title */}
              <div className="admin-form-field">
                <label htmlFor="field-title-ar">
                  العنوان بالعربية <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-title-ar"
                  name="title_ar"
                  type="text"
                  required
                  maxLength={200}
                  value={formValues.title_ar}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, title_ar: e.target.value }))
                  }
                  placeholder="مثال: حُرّاس الغابة"
                  aria-errormessage="err-title-ar"
                />
                <div id="err-title-ar" className="admin-field-error">
                  <span aria-hidden="true">⚠</span> يرجى إدخال عنوان الفيلم بالعربية.
                </div>
              </div>

              {/* Arabic Subtitle */}
              <div className="admin-form-field">
                <label htmlFor="field-subtitle-ar">العنوان الفرعي بالعربية</label>
                <input
                  id="field-subtitle-ar"
                  name="subtitle_ar"
                  type="text"
                  maxLength={200}
                  value={formValues.subtitle_ar}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      subtitle_ar: e.target.value,
                    }))
                  }
                  placeholder="مثال: سرّ القمر الأزرق"
                />
              </div>

              {/* Original Title */}
              <div className="admin-form-field">
                <label htmlFor="field-title-original">
                  العنوان الأصلي (بالإنجليزية) <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-title-original"
                  name="title_original"
                  type="text"
                  dir="ltr"
                  required
                  maxLength={200}
                  value={formValues.title_original}
                  onChange={(e) => {
                    const nextOriginal = e.target.value;
                    setFormValues((prev) => ({
                      ...prev,
                      title_original: nextOriginal,
                      slug:
                        !prev.movie_id && (!prev.slug || prev.slug === slugifyTitle(prev.title_original))
                          ? slugifyTitle(nextOriginal)
                          : prev.slug,
                    }));
                  }}
                  placeholder="FOREST GUARDIANS"
                  aria-errormessage="err-title-original"
                />
                <div id="err-title-original" className="admin-field-error">
                  <span aria-hidden="true">⚠</span> العنوان الأصلي مطلوب.
                </div>
              </div>

              {/* Unique Slug */}
              <div className="admin-form-field">
                <div className="admin-label-row">
                  <label htmlFor="field-slug">
                    الرابط المختصر (Slug) <span className="admin-required-mark">*</span>
                  </label>
                  <button
                    type="button"
                    className="admin-inline-helper-btn"
                    onClick={() =>
                      setFormValues((prev) => ({
                        ...prev,
                        slug: slugifyTitle(prev.title_original || prev.slug),
                      }))
                    }
                  >
                    توليد تلقائي
                  </button>
                </div>
                <input
                  id="field-slug"
                  name="slug"
                  type="text"
                  dir="ltr"
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  maxLength={120}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={formValues.slug}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase(),
                    }))
                  }
                  placeholder="forest-guardians"
                  aria-describedby="hint-slug"
                  aria-errormessage="err-slug"
                />
                <span id="hint-slug" className="admin-field-hint" dir="ltr">
                  /movies/{formValues.slug || "movie-slug"}
                </span>
                <div id="err-slug" className="admin-field-error">
                  <span aria-hidden="true">⚠</span> استخدم أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط (مثل: moon-forest).
                </div>
              </div>

              {/* Release Year */}
              <div className="admin-form-field">
                <label htmlFor="field-release-year">
                  سنة الإصدار <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-release-year"
                  name="release_year"
                  type="number"
                  inputMode="numeric"
                  required
                  min={1920}
                  max={2100}
                  dir="ltr"
                  value={formValues.release_year}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      release_year: e.target.value,
                    }))
                  }
                  aria-errormessage="err-release-year"
                />
                <div id="err-release-year" className="admin-field-error">
                  <span aria-hidden="true">⚠</span> أدخل سنة صحيحة بين 1920 و 2100.
                </div>
              </div>

              {/* Duration Minutes */}
              <div className="admin-form-field">
                <label htmlFor="field-duration-minutes">
                  المدة (بالدقائق) <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-duration-minutes"
                  name="duration_minutes"
                  type="number"
                  inputMode="numeric"
                  required
                  min={1}
                  max={600}
                  dir="ltr"
                  value={formValues.duration_minutes}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      duration_minutes: e.target.value,
                    }))
                  }
                  aria-errormessage="err-duration-minutes"
                />
                <div id="err-duration-minutes" className="admin-field-error">
                  <span aria-hidden="true">⚠</span> أدخل مدة الفيلم بالدقائق (1 - 600).
                </div>
              </div>

              {/* Rating */}
              <div className="admin-form-field">
                <label htmlFor="field-rating">
                  التقييم (من 10) <span className="admin-required-mark">*</span>
                </label>
                <input
                  id="field-rating"
                  name="rating"
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  required
                  dir="ltr"
                  value={formValues.rating}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, rating: e.target.value }))
                  }
                  aria-errormessage="err-rating"
                />
                <div id="err-rating" className="admin-field-error">
                  <span aria-hidden="true">⚠</span> التقييم يجب أن يكون بين 0.0 و 10.0.
                </div>
              </div>

              {/* Age Rating */}
              <div className="admin-form-field">
                <label htmlFor="field-age-rating">
                  التصنيف العمري <span className="admin-required-mark">*</span>
                </label>
                <select
                  id="field-age-rating"
                  name="age_rating"
                  value={formValues.age_rating}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      age_rating: e.target.value,
                    }))
                  }
                >
                  <option value="جميع الأعمار">جميع الأعمار</option>
                  <option value="6+">6+</option>
                  <option value="7+">7+</option>
                  <option value="10+">10+</option>
                  <option value="12+">12+</option>
                  <option value="13+">13+</option>
                </select>
              </div>

              {/* Art Theme */}
              <div className="admin-form-field">
                <label htmlFor="field-theme">السمة اللونية البديلة (Theme)</label>
                <select
                  id="field-theme"
                  name="theme"
                  value={formValues.theme}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      theme: e.target.value as FormValues["theme"],
                    }))
                  }
                >
                  <option value="forest">الغابة (Forest)</option>
                  <option value="space">الفضاء (Space)</option>
                  <option value="ocean">المحيط (Ocean)</option>
                  <option value="desert">الواحة (Desert)</option>
                  <option value="sky">السماء (Sky)</option>
                </select>
              </div>

              {/* Franchise Label */}
              <div className="admin-form-field">
                <label htmlFor="field-franchise-ar">اسم السلسلة / العالم</label>
                <input
                  id="field-franchise-ar"
                  name="franchise_ar"
                  type="text"
                  maxLength={150}
                  value={formValues.franchise_ar}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      franchise_ar: e.target.value,
                    }))
                  }
                  placeholder="مثال: عالم الغابة المنسية"
                />
              </div>
            </div>

            {/* Artwork Uploads & URL Controls: Poster & Backdrop */}
            <div className="admin-artwork-uploads-grid">
              {/* Poster Upload & URL Card */}
              <div className="admin-artwork-card">
                <div className="admin-artwork-preview is-poster">
                  {formValues.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formValues.poster_url}
                      alt="معاينة ملصق الفيلم"
                    />
                  ) : (
                    <div className="admin-artwork-placeholder">
                      <Icon name="film" size={22} />
                      <span>معاينة الملصق</span>
                    </div>
                  )}
                </div>

                <div className="admin-artwork-controls">
                  <div className="admin-label-row">
                    <label htmlFor="field-poster-url">
                      ملصق الفيلم (Poster — رفع مباشر أو رابط)
                    </label>
                    <span className="admin-field-hint">JPEG / PNG / WebP · بحد أقصى 5MB</span>
                  </div>

                  <div className="admin-upload-btn-row">
                    <input
                      ref={posterFileInputRef}
                      id="file-poster-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="visually-hidden"
                      disabled={posterUpload.uploading || isPending}
                      onChange={(e) => handleArtworkFileSelect("poster", e)}
                    />
                    <label
                      htmlFor="file-poster-upload"
                      className={`admin-upload-trigger-btn ${
                        posterUpload.uploading ? "is-disabled" : ""
                      }`}
                    >
                      <Icon name="plus" size={14} />
                      <span>
                        {posterUpload.uploading
                          ? `جاري الرفع (${posterUpload.progress}%)...`
                          : formValues.poster_url
                          ? "استبدال صورة الملصق من جهازك"
                          : "رفع صورة الملصق من جهازك"}
                      </span>
                    </label>

                    {formValues.poster_url && (
                      <button
                        type="button"
                        className="admin-inline-helper-btn"
                        disabled={posterUpload.uploading || isPending}
                        onClick={() => {
                          if (posterUpload.tempUploadedUrl) {
                            void cleanupUnsavedUploadsAction(
                              [posterUpload.tempUploadedUrl],
                              formValues.movie_id || undefined
                            );
                          }
                          setPosterUpload(INITIAL_UPLOAD_STATE);
                          setFormValues((prev) => ({ ...prev, poster_url: "" }));
                        }}
                      >
                        مسح الصورة
                      </button>
                    )}
                  </div>

                  {posterUpload.uploading && (
                    <div className="admin-upload-progress" aria-hidden="true">
                      <div
                        className="admin-upload-progress-bar"
                        style={{ width: `${posterUpload.progress}%` }}
                      />
                    </div>
                  )}

                  {posterUpload.message && (
                    <div
                      className={`admin-upload-status ${
                        posterUpload.type === "error"
                          ? "is-error"
                          : posterUpload.type === "success"
                          ? "is-success"
                          : ""
                      }`}
                      role={posterUpload.type === "error" ? "alert" : "status"}
                    >
                      {posterUpload.message}
                    </div>
                  )}

                  <input
                    id="field-poster-url"
                    name="poster_url"
                    type="text"
                    dir="ltr"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={formValues.poster_url}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        poster_url: e.target.value,
                      }))
                    }
                    placeholder="https://... أو ارفع صورة من جهازك ليتم تعبئة الرابط تلقائيًا"
                  />
                </div>
              </div>

              {/* Backdrop Upload & URL Card */}
              <div className="admin-artwork-card">
                <div className="admin-artwork-preview is-backdrop">
                  {formValues.backdrop_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formValues.backdrop_url}
                      alt="معاينة خلفية الفيلم"
                    />
                  ) : (
                    <div className="admin-artwork-placeholder">
                      <Icon name="sparkles" size={22} />
                      <span>معاينة الخلفية العريضة</span>
                    </div>
                  )}
                </div>

                <div className="admin-artwork-controls">
                  <div className="admin-label-row">
                    <label htmlFor="field-backdrop-url">
                      خلفية الفيلم (Backdrop — رفع مباشر أو رابط)
                    </label>
                    <span className="admin-field-hint">JPEG / PNG / WebP · بحد أقصى 5MB</span>
                  </div>

                  <div className="admin-upload-btn-row">
                    <input
                      ref={backdropFileInputRef}
                      id="file-backdrop-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="visually-hidden"
                      disabled={backdropUpload.uploading || isPending}
                      onChange={(e) => handleArtworkFileSelect("backdrop", e)}
                    />
                    <label
                      htmlFor="file-backdrop-upload"
                      className={`admin-upload-trigger-btn ${
                        backdropUpload.uploading ? "is-disabled" : ""
                      }`}
                    >
                      <Icon name="plus" size={14} />
                      <span>
                        {backdropUpload.uploading
                          ? `جاري الرفع (${backdropUpload.progress}%)...`
                          : formValues.backdrop_url
                          ? "استبدال صورة الخلفية من جهازك"
                          : "رفع صورة الخلفية من جهازك"}
                      </span>
                    </label>

                    {formValues.backdrop_url && (
                      <button
                        type="button"
                        className="admin-inline-helper-btn"
                        disabled={backdropUpload.uploading || isPending}
                        onClick={() => {
                          if (backdropUpload.tempUploadedUrl) {
                            void cleanupUnsavedUploadsAction(
                              [backdropUpload.tempUploadedUrl],
                              formValues.movie_id || undefined
                            );
                          }
                          setBackdropUpload(INITIAL_UPLOAD_STATE);
                          setFormValues((prev) => ({ ...prev, backdrop_url: "" }));
                        }}
                      >
                        مسح الصورة
                      </button>
                    )}
                  </div>

                  {backdropUpload.uploading && (
                    <div className="admin-upload-progress" aria-hidden="true">
                      <div
                        className="admin-upload-progress-bar"
                        style={{ width: `${backdropUpload.progress}%` }}
                      />
                    </div>
                  )}

                  {backdropUpload.message && (
                    <div
                      className={`admin-upload-status ${
                        backdropUpload.type === "error"
                          ? "is-error"
                          : backdropUpload.type === "success"
                          ? "is-success"
                          : ""
                      }`}
                      role={backdropUpload.type === "error" ? "alert" : "status"}
                    >
                      {backdropUpload.message}
                    </div>
                  )}

                  <input
                    id="field-backdrop-url"
                    name="backdrop_url"
                    type="text"
                    dir="ltr"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={formValues.backdrop_url}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        backdrop_url: e.target.value,
                      }))
                    }
                    placeholder="https://... أو ارفع صورة من جهازك ليتم تعبئة الرابط تلقائيًا"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="admin-form-field admin-field-full">
              <label htmlFor="field-description-ar">
                قصة ووصف الفيلم بالعربية <span className="admin-required-mark">*</span>
              </label>
              <textarea
                id="field-description-ar"
                name="description_ar"
                rows={3}
                required
                minLength={5}
                maxLength={2000}
                value={formValues.description_ar}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    description_ar: e.target.value,
                  }))
                }
                placeholder="اكتب ملخصًا مشوقًا لقصة الفيلم..."
                aria-errormessage="err-description-ar"
              />
              <div id="err-description-ar" className="admin-field-error">
                <span aria-hidden="true">⚠</span> يرجى كتابة وصف للفيلم (5 أحرف على الأقل).
              </div>
            </div>

            {/* Video Source & Subtitles */}
            <div className="admin-form-field admin-field-full admin-video-config-box">
              <div className="admin-video-config-header">
                <strong>مصدر الفيديو والمشاهدة</strong>
                <span>(يدعم روابط MP4 المباشرة وروابط بث HLS بصيغة m3u8)</span>
              </div>
              <div className="admin-video-config-grid">
                <div className="admin-form-field">
                  <label htmlFor="field-video-url">رابط الفيديو</label>
                  <input
                    id="field-video-url"
                    name="video_url"
                    type="url"
                    dir="ltr"
                    value={formValues.video_url}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, video_url: e.target.value }))
                    }
                    placeholder="https://example.com/stream/movie.m3u8 أو https://.../movie.mp4"
                  />
                </div>
                <div className="admin-form-field">
                  <label htmlFor="field-subtitle-url">رابط ملف الترجمة (WebVTT .vtt)</label>
                  <input
                    id="field-subtitle-url"
                    name="subtitle_url"
                    type="url"
                    dir="ltr"
                    value={formValues.subtitle_url}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, subtitle_url: e.target.value }))
                    }
                    placeholder="https://example.com/subs/ar.vtt"
                  />
                </div>
                <div className="admin-form-field">
                  <label htmlFor="field-subtitle-lang">رمز لغة الترجمة</label>
                  <input
                    id="field-subtitle-lang"
                    name="subtitle_lang"
                    type="text"
                    dir="ltr"
                    maxLength={10}
                    value={formValues.subtitle_lang}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, subtitle_lang: e.target.value }))
                    }
                    placeholder="ar"
                  />
                </div>
              </div>
            </div>

            {/* Mutually Exclusive Radio Groups: Language & Publication Status */}
            <div className="admin-form-fieldsets-row">
              <fieldset className="admin-fieldset">
                <legend>
                  اللغة / النسخة الصوتية <span className="admin-required-mark">*</span>
                </legend>
                <div className="admin-radio-group">
                  <label className="admin-radio-option">
                    <input
                      type="radio"
                      name="audio_badge"
                      value="dubbed"
                      checked={formValues.audio_badge === "dubbed"}
                      onChange={() =>
                        setFormValues((prev) => ({ ...prev, audio_badge: "dubbed" }))
                      }
                    />
                    <span>مدبلج للعربية</span>
                  </label>
                  <label className="admin-radio-option">
                    <input
                      type="radio"
                      name="audio_badge"
                      value="subtitled"
                      checked={formValues.audio_badge === "subtitled"}
                      onChange={() =>
                        setFormValues((prev) => ({
                          ...prev,
                          audio_badge: "subtitled",
                        }))
                      }
                    />
                    <span>مترجم للعربية</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="admin-fieldset">
                <legend>
                  حالة النشر <span className="admin-required-mark">*</span>
                </legend>
                <div className="admin-radio-group">
                  <label className="admin-radio-option">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={formValues.status === "draft"}
                      onChange={() =>
                        setFormValues((prev) => ({ ...prev, status: "draft" }))
                      }
                    />
                    <span>مسودة (Draft)</span>
                  </label>
                  <label className="admin-radio-option">
                    <input
                      type="radio"
                      name="status"
                      value="published"
                      checked={formValues.status === "published"}
                      onChange={() =>
                        setFormValues((prev) => ({ ...prev, status: "published" }))
                      }
                    />
                    <span>منشور للزوار (Published)</span>
                  </label>
                </div>
              </fieldset>
            </div>

            {/* Categories Multi-Select Checkboxes */}
            <fieldset className="admin-fieldset admin-field-full">
              <legend>التصنيفات المرتبطة بالفيلم (أول تصنيف مختار يكون التصنيف الرئيسي)</legend>
              <div className="admin-checkbox-grid">
                {categories.map((cat) => {
                  const checked = formValues.category_ids.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className={`admin-checkbox-card ${checked ? "is-checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        name="category_ids"
                        value={cat.id}
                        checked={checked}
                        onChange={() => toggleCategoryId(cat.id)}
                      />
                      <span>{cat.title_ar}</span>
                      <small dir="ltr">{cat.slug}</small>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Display Flags */}
            <fieldset className="admin-fieldset admin-field-full">
              <legend>خيارات الظهور في الصفحة الرئيسية</legend>
              <div className="admin-checkbox-grid">
                <label className="admin-checkbox-card">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formValues.is_featured}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        is_featured: e.target.checked,
                      }))
                    }
                  />
                  <span>عرض في الواجهة المميزة (Featured)</span>
                </label>

                <label className="admin-checkbox-card">
                  <input
                    type="checkbox"
                    name="is_most_watched"
                    checked={formValues.is_most_watched}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        is_most_watched: e.target.checked,
                      }))
                    }
                  />
                  <span>قسم الأكثر مشاهدة</span>
                </label>

                <label className="admin-checkbox-card">
                  <input
                    type="checkbox"
                    name="is_recently_added"
                    checked={formValues.is_recently_added}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        is_recently_added: e.target.checked,
                      }))
                    }
                  />
                  <span>قسم أضيف حديثاً</span>
                </label>
              </div>
            </fieldset>

            <div className="admin-form-actions">
              <button
                type="submit"
                disabled={isPending || isAnyUploading}
                className="admin-primary-submit-btn"
              >
                <Icon name="check" size={16} />
                <span>
                  {isPending
                    ? "جاري الحفظ في قاعدة البيانات..."
                    : isAnyUploading
                    ? "يرجى انتظار اكتمال رفع الصور..."
                    : formValues.movie_id
                    ? "حفظ التعديلات"
                    : "إضافة الفيلم"}
                </span>
              </button>

              <button
                type="button"
                disabled={isPending || isAnyUploading}
                onClick={() => closeForm(true)}
                className="admin-secondary-btn"
              >
                <span>إلغاء</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Movies List Panel with Search & Filters */}
      <section className="admin-crud-panel" aria-labelledby="movies-list-heading">
        <header className="admin-panel-heading">
          <div>
            <div className="admin-panel-title-row">
              <span className="eyebrow">قاعدة بيانات Supabase</span>
              <AdminDataOriginBadge origin="database" />
            </div>
            <h2 id="movies-list-heading">
              قائمة الأفلام المسجلة
              <span style={{ color: "var(--orange)" }}>.</span>
            </h2>
            <p className="section-note">
              إجمالي الأفلام: {initialMovies.length} — منشور للعامة: {publishedCount} — مسودة:{" "}
              {draftCount}
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="admin-crud-action-btn is-enabled"
          >
            <Icon name="plus" size={16} />
            <span>إضافة فيلم جديد</span>
          </button>
        </header>

        {/* Search & Status Filters Bar */}
        <div className="admin-filters-bar" role="search" aria-label="تصفية وبحث الأفلام">
          <div className="admin-search-box">
            <Icon name="search" size={16} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعنوان العربي، الإنجليزي، أو الرابط المختصر (Slug)..."
              aria-label="ابحث في الأفلام"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          <div className="admin-status-filter-pills" role="group" aria-label="تصفية حسب حالة النشر">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`admin-filter-pill ${statusFilter === "all" ? "is-active" : ""}`}
            >
              الكل ({initialMovies.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`admin-filter-pill ${statusFilter === "published" ? "is-active" : ""}`}
            >
              منشور ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={`admin-filter-pill ${statusFilter === "draft" ? "is-active" : ""}`}
            >
              مسودة ({draftCount})
            </button>
          </div>
        </div>

        {/* Movies Data Table */}
        <div className="admin-panel-body">
          {filteredMovies.length === 0 ? (
            <div className="admin-empty-state">
              <p>
                {initialMovies.length === 0
                  ? "لا توجد أفلام مسجلة في قاعدة البيانات حالياً. اضغط على «إضافة فيلم جديد» للبدء."
                  : "لا توجد أفلام تطابق معايير البحث أو التصفية الحالية."}
              </p>
              {initialMovies.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="admin-crud-action-btn is-enabled"
                >
                  <Icon name="plus" size={16} />
                  <span>إضافة أول فيلم</span>
                </button>
              )}
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <caption>
                  عرض {filteredMovies.length} من أصل {initialMovies.length} فيلم في قاعدة البيانات
                </caption>
                <thead>
                  <tr>
                    <th scope="col">الفيلم</th>
                    <th scope="col">الرابط (Slug)</th>
                    <th scope="col">التصنيفات</th>
                    <th scope="col">السنة / المدة</th>
                    <th scope="col">اللغة</th>
                    <th scope="col">التقييم / العمر</th>
                    <th scope="col">الحالة</th>
                    <th scope="col">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovies.map((movie) => {
                    const linkedCategories = (movie.movie_categories ?? [])
                      .map((mc) => mc.categories?.title_ar)
                      .filter(Boolean);

                    return (
                      <tr key={movie.id}>
                        <td>
                          <div className="admin-movie-cell">
                            <div
                              className="admin-movie-thumb"
                              style={{
                                backgroundImage: movie.poster_url
                                  ? `url(${movie.poster_url})`
                                  : undefined,
                              }}
                              aria-hidden="true"
                            >
                              {!movie.poster_url && <Icon name="film" size={16} />}
                            </div>
                            <div>
                              <strong>{movie.title_ar}</strong>
                              <small dir="ltr">{movie.title_original}</small>
                            </div>
                          </div>
                        </td>
                        <td dir="ltr">
                          <code className="admin-slug-code">{movie.slug}</code>
                        </td>
                        <td>
                          {linkedCategories.length > 0 ? (
                            <div className="admin-inline-tags">
                              {linkedCategories.map((label, idx) => (
                                <span key={idx} className="admin-tag-chip">
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <small>بدون تصنيف</small>
                          )}
                        </td>
                        <td>
                          <strong>{movie.release_year}</strong>
                          <small>{movie.duration_label_ar || `${movie.duration_minutes} د`}</small>
                        </td>
                        <td>
                          <span className="admin-pill">
                            {movie.audio_badge === "dubbed" ? "مدبلج" : "مترجم"}
                          </span>
                        </td>
                        <td>
                          <strong dir="ltr">★ {movie.rating}</strong>
                          <small>{movie.age_rating}</small>
                        </td>
                        <td>
                          <span
                            className={`admin-status-badge is-${movie.status}`}
                          >
                            {movie.status === "published"
                              ? "منشور"
                              : movie.status === "draft"
                              ? "مسودة"
                              : "مؤرشف"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuickStatusToggle(movie)}
                              className="admin-action-chip"
                              title={
                                movie.status === "published"
                                  ? "تحويل إلى مسودة"
                                  : "نشر الفيلم للزوار"
                              }
                            >
                              {movie.status === "published" ? "إلغاء النشر" : "نشر"}
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => openEditForm(movie)}
                              className="admin-action-chip is-edit"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => promptDeleteMovie(movie)}
                              className="admin-action-chip is-delete"
                            >
                              حذف
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
        </div>
      </section>

      {/* Native Delete Confirmation Modal Dialog */}
      <dialog
        ref={deleteDialogRef}
        className="admin-confirm-dialog"
        aria-labelledby="delete-dialog-title"
        onClose={() => setMovieToDelete(null)}
        {...({ closedby: "any" } as Record<string, unknown>)}
      >
        <div className="admin-confirm-dialog-body">
          <span className="eyebrow" style={{ color: "var(--coral)" }}>
            تأكيد الحذف النهائي
          </span>
          <h3 id="delete-dialog-title">
            هل أنت متأكد من حذف فيلم «{movieToDelete?.title_ar}»؟
          </h3>
          <p>
            سيتم حذف الفيلم وجميع ارتباطاته بالتصنيفات نهائيًا من قاعدة بيانات Supabase ولا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="admin-confirm-dialog-actions">
            <button
              type="button"
              disabled={isPending}
              onClick={confirmDeleteMovie}
              className="admin-danger-btn"
            >
              {isPending ? "جاري الحذف..." : "نعم، احذف الفيلم"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={cancelDeleteMovie}
              className="admin-secondary-btn"
            >
              إلغاء
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
