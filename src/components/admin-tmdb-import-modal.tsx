"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import {
  getTmdbMoviePreviewAction,
  getTmdbSeasonEpisodesAction,
  getTmdbSeriesPreviewAction,
  importTmdbMovieAction,
  importTmdbSeriesAction,
  searchTmdbAction,
} from "@/app/admin/(protected)/tmdb/actions";
import type {
  TmdbMoviePreview,
  TmdbSearchResult,
  TmdbSeasonPreview,
  TmdbSeriesPreview,
} from "@/lib/tmdb-service";

export type AdminTmdbImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMediaType?: "movie" | "tv";
  categories: Array<{ id: string; title_ar: string; slug: string }>;
  onSuccess: (importedId: string, type: "movie" | "tv") => void;
};

type Step = "search" | "preview_movie" | "preview_series" | "importing" | "success";

export function AdminTmdbImportModal({
  isOpen,
  onClose,
  defaultMediaType = "movie",
  categories,
  onSuccess,
}: AdminTmdbImportModalProps) {
  const [step, setStep] = useState<Step>("search");
  const [mediaType, setMediaType] = useState<"movie" | "tv">(defaultMediaType);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, startSearchTransition] = useTransition();
  const [isLoadingPreview, startPreviewTransition] = useTransition();
  const [isImporting, startImportTransition] = useTransition();

  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Movie Preview State
  const [moviePreview, setMoviePreview] = useState<TmdbMoviePreview | null>(null);

  // Series Preview State
  const [seriesPreview, setSeriesPreview] = useState<TmdbSeriesPreview | null>(null);
  const [expandedSeasonNum, setExpandedSeasonNum] = useState<number | null>(null);
  const [loadingSeasonEpisodes, setLoadingSeasonEpisodes] = useState<number | null>(null);
  const [includeSpecials, setIncludeSpecials] = useState(false);

  // Import Result State
  const [importResult, setImportResult] = useState<{
    id: string;
    type: "movie" | "tv";
    message: string;
    details?: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep("search");
      setMediaType(defaultMediaType);
      setSearchQuery("");
      setSearchResults([]);
      setSearchError(null);
      setMoviePreview(null);
      setSeriesPreview(null);
      setImportResult(null);
      setImportError(null);
    }
  }, [isOpen, defaultMediaType]);

  if (!isOpen) return null;

  // Search TMDB
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setSearchError(null);
    startSearchTransition(async () => {
      const res = await searchTmdbAction(searchQuery, mediaType);
      if (!res.ok) {
        setSearchError(res.error ?? "تعذر البحث في TMDB.");
        setSearchResults([]);
      } else {
        setSearchResults(res.data?.results || []);
        if ((res.data?.results || []).length === 0) {
          setSearchError("لم يتم العثور على نتائج تطابق بحثك. جرّب كتابة الاسم بالإنجليزية أو بكلمات أخرى.");
        }
      }
    });
  };

  // Select Item from Search
  const handleSelectItem = (item: TmdbSearchResult) => {
    setSearchError(null);
    if (item.media_type === "movie") {
      startPreviewTransition(async () => {
        const res = await getTmdbMoviePreviewAction(item.id);
        if (!res.ok || !res.data) {
          setSearchError(res.error ?? "تعذر جلب تفاصيل الفيلم من TMDB.");
          return;
        }
        setMoviePreview(res.data);
        setStep("preview_movie");
      });
    } else {
      startPreviewTransition(async () => {
        const res = await getTmdbSeriesPreviewAction(item.id, includeSpecials);
        if (!res.ok || !res.data) {
          setSearchError(res.error ?? "تعذر جلب تفاصيل المسلسل من TMDB.");
          return;
        }
        setSeriesPreview(res.data);
        setStep("preview_series");
      });
    }
  };

  // Toggle Season Selection
  const toggleSeasonSelect = (seasonNum: number) => {
    if (!seriesPreview) return;
    setSeriesPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        seasons: prev.seasons.map((s) =>
          s.season_number === seasonNum ? { ...s, selected: !s.selected } : s
        ),
      };
    });
  };

  // Load and Expand Episodes for a Season
  const handleToggleExpandSeason = async (season: TmdbSeasonPreview) => {
    if (expandedSeasonNum === season.season_number) {
      setExpandedSeasonNum(null);
      return;
    }

    setExpandedSeasonNum(season.season_number);

    // If episodes not yet loaded for this season, fetch them now
    if (season.episodes.length === 0 && seriesPreview) {
      setLoadingSeasonEpisodes(season.season_number);
      const res = await getTmdbSeasonEpisodesAction(
        seriesPreview.tmdb_id,
        season.season_number,
        seriesPreview.existing_record?.id
      );
      setLoadingSeasonEpisodes(null);

      if (res.ok && res.data) {
        setSeriesPreview((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            seasons: prev.seasons.map((s) =>
              s.season_number === season.season_number ? { ...s, episodes: res.data || [] } : s
            ),
          };
        });
      }
    }
  };

  // Toggle Single Episode Selection
  const toggleEpisodeSelect = (seasonNum: number, epNum: number) => {
    if (!seriesPreview) return;
    setSeriesPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        seasons: prev.seasons.map((s) => {
          if (s.season_number !== seasonNum) return s;
          return {
            ...s,
            episodes: s.episodes.map((ep) =>
              ep.episode_number === epNum ? { ...ep, selected: !ep.selected } : ep
            ),
          };
        }),
      };
    });
  };

  // Select Only Missing Episodes in a Season
  const handleSelectOnlyMissingEpisodes = (seasonNum: number) => {
    if (!seriesPreview) return;
    setSeriesPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        seasons: prev.seasons.map((s) => {
          if (s.season_number !== seasonNum) return s;
          return {
            ...s,
            episodes: s.episodes.map((ep) => ({
              ...ep,
              selected: !ep.already_in_db,
            })),
          };
        }),
      };
    });
  };

  // Toggle Category Selection
  const toggleCategory = (catId: string, isMovie: boolean) => {
    if (isMovie && moviePreview) {
      const exists = moviePreview.category_ids.includes(catId);
      setMoviePreview({
        ...moviePreview,
        category_ids: exists
          ? moviePreview.category_ids.filter((id) => id !== catId)
          : [...moviePreview.category_ids, catId],
      });
    } else if (!isMovie && seriesPreview) {
      const exists = seriesPreview.category_ids.includes(catId);
      setSeriesPreview({
        ...seriesPreview,
        category_ids: exists
          ? seriesPreview.category_ids.filter((id) => id !== catId)
          : [...seriesPreview.category_ids, catId],
      });
    }
  };

  // Save Movie Import
  const handleImportMovie = () => {
    if (!moviePreview) return;
    setImportError(null);
    setStep("importing");

    startImportTransition(async () => {
      const res = await importTmdbMovieAction({
        tmdb_id: moviePreview.tmdb_id,
        title_ar: moviePreview.title_ar,
        title_original: moviePreview.title_original,
        subtitle_ar: moviePreview.subtitle_ar,
        franchise_ar: moviePreview.franchise_ar,
        slug: moviePreview.slug,
        description_ar: moviePreview.overview_ar || moviePreview.overview_en,
        release_year: moviePreview.release_year,
        duration_minutes: moviePreview.runtime_minutes,
        duration_label_ar: moviePreview.duration_label_ar,
        rating: moviePreview.rating,
        age_rating: moviePreview.age_rating,
        audio_badge: moviePreview.audio_badge,
        theme: moviePreview.theme,
        accent_color: moviePreview.accent_color,
        poster_url: moviePreview.poster_url || undefined,
        backdrop_url: moviePreview.backdrop_url || undefined,
        category_ids: moviePreview.category_ids,
        existing_movie_id: moviePreview.existing_record?.id,
      });

      if (!res.ok || !res.data) {
        setImportError(res.error ?? "فشل استيراد الفيلم.");
        setStep("preview_movie");
      } else {
        setImportResult({
          id: res.data.movieId,
          type: "movie",
          message: res.message ?? "تم استيراد الفيلم بنجاح كمسودة.",
        });
        setStep("success");
      }
    });
  };

  // Save Series Import
  const handleImportSeries = () => {
    if (!seriesPreview) return;
    setImportError(null);
    setStep("importing");

    startImportTransition(async () => {
      // Build selected seasons and episodes payload
      const seasonsToImport = [];

      for (const season of seriesPreview.seasons) {
        if (!season.selected || season.season_number <= 0) continue;

        // Ensure episodes are fetched if not yet loaded
        let episodes = season.episodes;
        if (episodes.length === 0) {
          const epRes = await getTmdbSeasonEpisodesAction(
            seriesPreview.tmdb_id,
            season.season_number,
            seriesPreview.existing_record?.id
          );
          if (epRes.ok && epRes.data) {
            episodes = epRes.data;
          }
        }

        const selectedEpisodes = episodes.filter((ep) => ep.selected);

        seasonsToImport.push({
          season_number: season.season_number,
          title_ar: season.name_ar,
          title_original: season.name_original,
          description_ar: season.overview_ar,
          poster_url: season.poster_url || undefined,
          episodes: selectedEpisodes.map((ep) => ({
            episode_number: ep.episode_number,
            title_ar: ep.title_ar,
            title_original: ep.title_original,
            description_ar: ep.overview_ar,
            duration_minutes: ep.duration_minutes,
            still_url: ep.still_url || undefined,
            tmdb_id: ep.tmdb_id,
          })),
        });
      }

      const res = await importTmdbSeriesAction({
        tmdb_id: seriesPreview.tmdb_id,
        title_ar: seriesPreview.title_ar,
        title_original: seriesPreview.title_original,
        subtitle_ar: seriesPreview.subtitle_ar,
        franchise_ar: seriesPreview.franchise_ar,
        slug: seriesPreview.slug,
        description_ar: seriesPreview.overview_ar || seriesPreview.overview_en,
        release_year: seriesPreview.release_year,
        rating: seriesPreview.rating,
        age_rating: seriesPreview.age_rating,
        audio_badge: seriesPreview.audio_badge,
        theme: seriesPreview.theme,
        accent_color: seriesPreview.accent_color,
        poster_url: seriesPreview.poster_url || undefined,
        backdrop_url: seriesPreview.backdrop_url || undefined,
        category_ids: seriesPreview.category_ids,
        existing_series_id: seriesPreview.existing_record?.id,
        seasons: seasonsToImport,
      });

      if (!res.ok || !res.data) {
        setImportError(res.error ?? "فشل استيراد المسلسل.");
        setStep("preview_series");
      } else {
        setImportResult({
          id: res.data.seriesId,
          type: "tv",
          message: res.message ?? "تم استيراد المسلسل بنجاح.",
          details: `المواسم: ${res.data.seasonsCount} — الحلقات: ${res.data.episodesCount}`,
        });
        setStep("success");
      }
    });
  };

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tmdb-import-title">
      <div className="admin-modal-panel tmdb-import-panel">
        {/* Modal Header */}
        <div className="admin-modal-header">
          <div className="tmdb-header-title">
            <span className="tmdb-badge">TMDB</span>
            <h3 id="tmdb-import-title" className="admin-modal-title">
              {step === "search" && "استيراد المحتوى والبيانات الذكي من TMDB"}
              {step === "preview_movie" && `مراجعة بيانات الفيلم: ${moviePreview?.title_ar || ""}`}
              {step === "preview_series" && `مراجعة بيانات المسلسل: ${seriesPreview?.title_ar || ""}`}
              {step === "importing" && "جارٍ استيراد وحفظ المحتوى..."}
              {step === "success" && "تم الاستيراد بنجاح!"}
            </h3>
          </div>
          <button
            type="button"
            className="admin-modal-close-btn"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            disabled={isImporting}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="admin-modal-body">
          {/* STEP 1: SEARCH */}
          {step === "search" && (
            <div className="tmdb-search-step">
              {/* Type Switcher */}
              <div className="tmdb-type-toggle">
                <button
                  type="button"
                  className={`tmdb-type-btn ${mediaType === "movie" ? "is-active" : ""}`}
                  onClick={() => setMediaType("movie")}
                >
                  <Icon name="film" size={16} />
                  <span>أفلام (Movies)</span>
                </button>
                <button
                  type="button"
                  className={`tmdb-type-btn ${mediaType === "tv" ? "is-active" : ""}`}
                  onClick={() => setMediaType("tv")}
                >
                  <Icon name="sparkles" size={16} />
                  <span>مسلسلات (TV Series)</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="tmdb-search-bar">
                <input
                  type="text"
                  className="tmdb-search-input"
                  placeholder={
                    mediaType === "movie"
                      ? "ابحث باسم الفيلم (مثلاً: شركة المرعبين المحدودة أو Monsters, Inc.)..."
                      : "ابحث باسم المسلسل (مثلاً: جرافيتي فولز أو Gravity Falls)..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  autoFocus
                />
                <button
                  type="button"
                  className="tmdb-search-btn"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <span className="cartoony-spinner-sm" />
                  ) : (
                    <span>بحث في TMDB</span>
                  )}
                </button>
              </div>

              {/* Error / Hint message */}
              {searchError && (
                <div className="tmdb-alert is-warning" role="alert">
                  <span>⚠</span>
                  <p>{searchError}</p>
                </div>
              )}

              {/* Search Results Grid */}
              {searchResults.length > 0 && (
                <div className="tmdb-results-container">
                  <p className="tmdb-results-count">
                    عُثر على {searchResults.length} نتيجة:
                  </p>
                  <div className="tmdb-results-grid">
                    {searchResults.map((item) => (
                      <div key={`${item.media_type}-${item.id}`} className="tmdb-result-card">
                        <div className="tmdb-card-poster">
                          {item.poster_url ? (
                            <img src={item.poster_url} alt={item.title} loading="lazy" />
                          ) : (
                            <div className="tmdb-no-poster">لا يوجد بوستر</div>
                          )}
                          <span className="tmdb-year-badge">{item.release_year}</span>
                        </div>
                        <div className="tmdb-card-info">
                          <h4 className="tmdb-card-title">{item.title_ar || item.title}</h4>
                          {item.title_original && item.title_original !== item.title && (
                            <span className="tmdb-card-orig-title" dir="ltr">
                              {item.title_original}
                            </span>
                          )}
                          <p className="tmdb-card-desc">
                            {item.overview || "لا يوجد ملخص متاح حالياً."}
                          </p>

                          {/* Existing Badge */}
                          {item.existingInDb && (
                            <div className="tmdb-existing-pill">
                              <span>✓ موجود في كارتوني</span>
                            </div>
                          )}

                          <button
                            type="button"
                            className="tmdb-select-btn"
                            onClick={() => handleSelectItem(item)}
                            disabled={isLoadingPreview}
                          >
                            <span>اختيار ومعاينة البيانات ➔</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW MOVIE */}
          {step === "preview_movie" && moviePreview && (
            <div className="tmdb-preview-step">
              {/* Back to search */}
              <button
                type="button"
                className="tmdb-back-btn"
                onClick={() => setStep("search")}
              >
                ← العودة لنتائج البحث
              </button>

              {/* Duplicate Notice */}
              {moviePreview.existing_record && (
                <div className="tmdb-alert is-info">
                  <span>ℹ️</span>
                  <div>
                    <strong>هذا الفيلم موجود بالفعل في قاعدة البيانات!</strong>
                    <p>
                      مرتبط بالفيلم الحالي «{moviePreview.existing_record.title_ar}» (المعرف: {moviePreview.existing_record.slug}).
                      سيتم تحديث البيانات وتصنيفاتها بأمان، مع <strong>الحفاظ الكامل على روابط وسيرفرات المشاهدة الحالية دون مساس</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Grid */}
              <div className="tmdb-form-grid">
                <div className="admin-form-field">
                  <label>العنوان بالعربية</label>
                  <input
                    type="text"
                    value={moviePreview.title_ar}
                    onChange={(e) => setMoviePreview({ ...moviePreview, title_ar: e.target.value })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>العنوان الأصلي (بالإنجليزية)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={moviePreview.title_original}
                    onChange={(e) => setMoviePreview({ ...moviePreview, title_original: e.target.value })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>الاسم اللطيف (Slug)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={moviePreview.slug}
                    onChange={(e) => setMoviePreview({ ...moviePreview, slug: e.target.value })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>سنة الإنتاج</label>
                  <input
                    type="number"
                    value={moviePreview.release_year}
                    onChange={(e) => setMoviePreview({ ...moviePreview, release_year: parseInt(e.target.value, 10) || 2026 })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>مدة العرض (بالدقائق)</label>
                  <input
                    type="number"
                    value={moviePreview.runtime_minutes}
                    onChange={(e) => setMoviePreview({ ...moviePreview, runtime_minutes: parseInt(e.target.value, 10) || 90 })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>التقييم (من 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={moviePreview.rating}
                    onChange={(e) => setMoviePreview({ ...moviePreview, rating: parseFloat(e.target.value) || 8.0 })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="admin-form-field">
                <label>ملخص القصة بالعربية</label>
                <textarea
                  rows={4}
                  value={moviePreview.overview_ar}
                  onChange={(e) => setMoviePreview({ ...moviePreview, overview_ar: e.target.value })}
                />
              </div>

              {/* Category Checkboxes */}
              <div className="admin-form-field">
                <label>التصنيفات المربوطة (تم تحديدها تلقائياً حسب نوع الفيلم):</label>
                <div className="tmdb-categories-row">
                  {categories.map((c) => (
                    <label key={c.id} className="tmdb-checkbox-label">
                      <input
                        type="checkbox"
                        checked={moviePreview.category_ids.includes(c.id)}
                        onChange={() => toggleCategory(c.id, true)}
                      />
                      <span>{c.title_ar}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Artwork Gallery Selection */}
              <div className="tmdb-artwork-section">
                <h4>اختر البوستر والخلفية من ملصقات TMDB:</h4>
                <div className="tmdb-artwork-columns">
                  {/* Posters */}
                  <div className="artwork-picker-col">
                    <label>البوستر (اضغط للاختيار):</label>
                    <div className="artwork-thumbnails-grid">
                      {moviePreview.available_posters.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`artwork-thumb-btn ${moviePreview.poster_url === p.url ? "is-selected" : ""}`}
                          onClick={() => setMoviePreview({ ...moviePreview, poster_url: p.url })}
                        >
                          <img src={p.url} alt={`Poster ${idx + 1}`} loading="lazy" />
                          {moviePreview.poster_url === p.url && <span className="selected-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Backdrops */}
                  <div className="artwork-picker-col">
                    <label>الخلفية العريضة (اضغط للاختيار):</label>
                    <div className="artwork-thumbnails-grid is-backdrops">
                      {moviePreview.available_backdrops.map((b, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`artwork-thumb-btn is-backdrop ${moviePreview.backdrop_url === b.originalUrl ? "is-selected" : ""}`}
                          onClick={() => setMoviePreview({ ...moviePreview, backdrop_url: b.originalUrl })}
                        >
                          <img src={b.url} alt={`Backdrop ${idx + 1}`} loading="lazy" />
                          {moviePreview.backdrop_url === b.originalUrl && <span className="selected-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="tmdb-actions-row">
                <button
                  type="button"
                  className="tmdb-cancel-btn"
                  onClick={() => setStep("search")}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  className="tmdb-confirm-btn"
                  onClick={handleImportMovie}
                  disabled={isImporting}
                >
                  <Icon name="sparkles" size={16} />
                  <span>
                    {moviePreview.existing_record
                      ? "تأكيد ربط وتحديث بيانات الفيلم"
                      : "استيراد وحفظ الفيلم كمسودة"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW SERIES */}
          {step === "preview_series" && seriesPreview && (
            <div className="tmdb-preview-step">
              <button
                type="button"
                className="tmdb-back-btn"
                onClick={() => setStep("search")}
              >
                ← العودة لنتائج البحث
              </button>

              {/* Duplicate Notice */}
              {seriesPreview.existing_record && (
                <div className="tmdb-alert is-info">
                  <span>ℹ️</span>
                  <div>
                    <strong>هذا المسلسل موجود بالفعل في قاعدة البيانات!</strong>
                    <p>
                      مرتبط بالمسلسل «{seriesPreview.existing_record.title_ar}» (المعرف: {seriesPreview.existing_record.slug}).
                      يمكنك تحديد المواسم والحلقات الناقصة لاستيرادها فقط، مع الحفاظ على الحلقات وسيرفرات المشاهدة المسجلة حالياً.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Grid */}
              <div className="tmdb-form-grid">
                <div className="admin-form-field">
                  <label>اسم المسلسل بالعربية</label>
                  <input
                    type="text"
                    value={seriesPreview.title_ar}
                    onChange={(e) => setSeriesPreview({ ...seriesPreview, title_ar: e.target.value })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>الاسم الأصلي (بالإنجليزية)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={seriesPreview.title_original}
                    onChange={(e) => setSeriesPreview({ ...seriesPreview, title_original: e.target.value })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>الاسم اللطيف (Slug)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={seriesPreview.slug}
                    onChange={(e) => setSeriesPreview({ ...seriesPreview, slug: e.target.value })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>سنة البداية</label>
                  <input
                    type="number"
                    value={seriesPreview.release_year}
                    onChange={(e) => setSeriesPreview({ ...seriesPreview, release_year: parseInt(e.target.value, 10) || 2026 })}
                  />
                </div>
              </div>

              {/* Overview */}
              <div className="admin-form-field">
                <label>ملخص القصة بالعربية</label>
                <textarea
                  rows={3}
                  value={seriesPreview.overview_ar}
                  onChange={(e) => setSeriesPreview({ ...seriesPreview, overview_ar: e.target.value })}
                />
              </div>

              {/* Seasons & Episodes Selector */}
              <div className="tmdb-seasons-section">
                <div className="tmdb-seasons-header">
                  <h4>قائمة المواسم والحلقات المتاحة في TMDB:</h4>
                  <label className="tmdb-checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeSpecials}
                      onChange={(e) => {
                        setIncludeSpecials(e.target.checked);
                        // Refresh preview with specials
                        startPreviewTransition(async () => {
                          const res = await getTmdbSeriesPreviewAction(seriesPreview.tmdb_id, e.target.checked);
                          if (res.ok && res.data) setSeriesPreview(res.data);
                        });
                      }}
                    />
                    <span>تضمين الحلقات الخاصة (Specials)</span>
                  </label>
                </div>

                <div className="tmdb-seasons-list">
                  {seriesPreview.seasons.map((season) => (
                    <div key={season.season_number} className="tmdb-season-card">
                      <div className="tmdb-season-row">
                        <label className="season-check-wrap">
                          <input
                            type="checkbox"
                            checked={season.selected}
                            onChange={() => toggleSeasonSelect(season.season_number)}
                          />
                          <span className="season-name">{season.name_ar}</span>
                        </label>

                        <div className="season-meta">
                          <span className="season-ep-count">
                            {season.episode_count} حلقة
                          </span>
                          {season.already_in_db && (
                            <span className="season-in-db-badge">موجود مسبقاً</span>
                          )}
                          <button
                            type="button"
                            className="season-expand-btn"
                            onClick={() => handleToggleExpandSeason(season)}
                          >
                            <span>
                              {expandedSeasonNum === season.season_number ? "إخفاء الحلقات ▲" : "عرض الحلقات ▼"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Expanded Episodes List */}
                      {expandedSeasonNum === season.season_number && (
                        <div className="tmdb-season-episodes-wrap">
                          {loadingSeasonEpisodes === season.season_number ? (
                            <div className="episodes-loading">
                              <span className="cartoony-spinner-sm" />
                              <span>جارٍ جلب تفاصيل حلقات الموسم من TMDB...</span>
                            </div>
                          ) : (
                            <>
                              <div className="episodes-actions-subbar">
                                <span>الحلقات ({season.episodes.length}):</span>
                                <button
                                  type="button"
                                  className="tmdb-quick-filter-btn"
                                  onClick={() => handleSelectOnlyMissingEpisodes(season.season_number)}
                                >
                                  تحديد الحلقات غير الموجودة فقط
                                </button>
                              </div>

                              <div className="tmdb-episodes-list">
                                {season.episodes.map((ep) => (
                                  <div
                                    key={ep.episode_number}
                                    className={`tmdb-episode-item ${ep.already_in_db ? "is-in-db" : ""}`}
                                  >
                                    <label className="episode-check-wrap">
                                      <input
                                        type="checkbox"
                                        checked={ep.selected}
                                        onChange={() => toggleEpisodeSelect(season.season_number, ep.episode_number)}
                                      />
                                      <span className="ep-num">#{ep.episode_number}</span>
                                      <span className="ep-title">{ep.title_ar}</span>
                                    </label>
                                    <div className="ep-meta-tags">
                                      {ep.already_in_db ? (
                                        <span className="ep-status-pill in-db">موجود بالقاعدة</span>
                                      ) : (
                                        <span className="ep-status-pill new">حلقة جديدة</span>
                                      )}
                                      <span className="ep-duration">{ep.duration_minutes} د</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="tmdb-actions-row">
                <button
                  type="button"
                  className="tmdb-cancel-btn"
                  onClick={() => setStep("search")}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  className="tmdb-confirm-btn"
                  onClick={handleImportSeries}
                  disabled={isImporting}
                >
                  <Icon name="sparkles" size={16} />
                  <span>
                    {seriesPreview.existing_record
                      ? "استيراد الحلقات المحددة وتحديث المسلسل"
                      : "استيراد المسلسل والمواسم المحددة كمسودة"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING PROGRESS */}
          {step === "importing" && (
            <div className="tmdb-progress-step">
              <div className="cartoony-spinner" />
              <h4>جارٍ استيراد وحفظ المحتوى بأمان...</h4>
              <p>يتم تخزين البيانات وربط التصنيفات وحفظ الحلقات كمسودة قابلة للمراجعة.</p>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && importResult && (
            <div className="tmdb-success-step">
              <div className="success-icon-bubble">✓</div>
              <h4>{importResult.message}</h4>
              {importResult.details && <p className="success-details">{importResult.details}</p>}
              <p className="success-hint">
                تم حفظ المحتوى كـ <strong>مسودة (Draft)</strong> لحمايته حتى تقوم بمراجعته وإضافة روابط المشاهدة ونشره.
              </p>
              <div className="success-actions">
                <button
                  type="button"
                  className="tmdb-confirm-btn"
                  onClick={() => {
                    onSuccess(importResult.id, importResult.type);
                    onClose();
                  }}
                >
                  <span>فتح المحتوى في لوحة التحكم الآن</span>
                  <Icon name="arrow" size={14} />
                </button>
                <button
                  type="button"
                  className="tmdb-cancel-btn"
                  onClick={() => setStep("search")}
                >
                  استيراد عمل آخر
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
