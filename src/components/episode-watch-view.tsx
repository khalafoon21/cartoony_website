"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { MovieRow } from "@/components/movie-row";
import { VideoPlayer } from "@/components/video-player";
import { useWatchlist } from "@/lib/use-watchlist";
import type { Movie } from "@/lib/movies";
import type { PublicEpisode, PublicSeason } from "@/lib/movies-public";

export type EpisodeWatchViewProps = {
  series: Movie;
  seasons: PublicSeason[];
  currentSeason: PublicSeason;
  currentEpisode: PublicEpisode;
  previousEpisode: { season: PublicSeason; episode: PublicEpisode } | null;
  nextEpisode: { season: PublicSeason; episode: PublicEpisode } | null;
  related: Movie[];
};

export function EpisodeWatchView({
  series,
  seasons,
  currentSeason,
  currentEpisode,
  previousEpisode,
  nextEpisode,
  related,
}: EpisodeWatchViewProps) {
  const { savedIds, toggleSave } = useWatchlist();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(currentSeason.id);
  const [copiedLink, setCopiedLink] = useState(false);

  const saved = savedIds.includes(series.id);
  const isDubbed = (currentEpisode.audioBadge || series.audioBadge || "").includes("مدبلج");

  const activeSeason =
    seasons.find((s) => s.id === selectedSeasonId) ?? currentSeason;

  const playerPoster =
    currentEpisode.stillUrl || series.backdropUrl || series.posterUrl;

  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: `مشاهدة ${series.title} - ${currentEpisode.title} | كارتوني`,
          text: currentEpisode.description || series.description,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Ignore share cancellation
    }
  };

  return (
    <div className="watch-page-container">
      {/* Lightweight Top Navigation Row */}
      <div className="watch-top-nav">
        <div className="watch-top-start">
          <Link href={`/series/${series.slug}`} className="watch-back-link">
            <Icon name="arrow" size={16} />
            <span>العودة لصفحة المسلسل</span>
          </Link>
          <div className="watch-breadcrumb" aria-label="مسار الصفحة">
            <Link href="/series">المسلسلات</Link>
            <span className="meta-dot" />
            <Link href={`/series/${series.slug}`}>{series.title}</Link>
            <span className="meta-dot" />
            <span>{currentSeason.title}</span>
            <span className="meta-dot" />
            <span className="current">{currentEpisode.title}</span>
          </div>
        </div>

        <div className="watch-top-actions">
          <button
            type="button"
            className={`watch-action-pill ${saved ? "is-saved" : ""}`}
            onClick={() => toggleSave(series.id)}
            aria-pressed={saved}
          >
            <Icon name={saved ? "heartFilled" : "heart"} size={14} />
            <span>{saved ? "في قائمتي" : "حفظ المسلسل"}</span>
          </button>

          <button
            type="button"
            className="watch-action-pill"
            onClick={handleShare}
            title="مشاركة رابط الحلقة"
          >
            <Icon name={copiedLink ? "check" : "share"} size={14} />
            <span>{copiedLink ? "تم النسخ" : "مشاركة"}</span>
          </button>
        </div>
      </div>

      {/* Clean Video Player Frame */}
      <div className="watch-player-frame">
        {currentEpisode.videoUrl ? (
          <VideoPlayer
            src={currentEpisode.videoUrl}
            poster={playerPoster}
            title={`${series.title} — ${currentSeason.title}: ${currentEpisode.title}`}
            subtitleUrl={currentEpisode.subtitleUrl}
            subtitleLang={currentEpisode.subtitleLang}
            accentColor={series.accent}
            contentId={currentEpisode.id}
            contentType="episode"
            videoType={currentEpisode.videoType}
            servers={currentEpisode.servers}
          />
        ) : (
          <div className="watch-unavailable-card">
            <div className="unavailable-icon-bubble">
              <Icon name="sparkles" size={40} />
            </div>
            <h2>هذه الحلقة غير متاحة للمشاهدة الآن</h2>
            <p>
              لم تتم إضافة مصدر تشغيل مباشر لهذه الحلقة بعد. يمكنك تصفح باقي الحلقات
              أو تفاصيل المسلسل.
            </p>
            <div className="unavailable-actions">
              <Link href={`/series/${series.slug}`} className="primary-button">
                <Icon name="sparkles" size={16} />
                <span>عرض قائمة الحلقات</span>
              </Link>
              {nextEpisode && (
                <Link
                  href={`/watch/series/${series.slug}/${nextEpisode.episode.slug}`}
                  className="text-button"
                >
                  <span>الحلقة التالية</span>
                  <Icon name="arrow" size={16} />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Episode Navigation Bar: Prev / Current / Next */}
      <nav className="watch-episode-nav-bar" aria-label="تنقل الحلقات">
        <div className="ep-nav-col is-prev">
          {previousEpisode ? (
            <Link
              href={`/watch/series/${series.slug}/${previousEpisode.episode.slug}`}
              className="ep-nav-btn"
              title={`الحلقة السابقة: ${previousEpisode.episode.title}`}
            >
              <Icon name="arrow" size={16} className="ep-nav-arrow-prev" />
              <div className="ep-nav-text">
                <span className="ep-nav-hint">الحلقة السابقة</span>
                <span className="ep-nav-title">
                  {previousEpisode.season.title} • {previousEpisode.episode.title}
                </span>
              </div>
            </Link>
          ) : (
            <span className="ep-nav-btn is-disabled" aria-disabled="true">
              <span className="ep-nav-hint">بداية المسلسل</span>
            </span>
          )}
        </div>

        <div className="ep-nav-center">
          <span className="ep-nav-curr-badge">
            {currentSeason.title} • {currentEpisode.title}
          </span>
        </div>

        <div className="ep-nav-col is-next">
          {nextEpisode ? (
            <Link
              href={`/watch/series/${series.slug}/${nextEpisode.episode.slug}`}
              className="ep-nav-btn is-next-btn"
              title={`الحلقة التالية: ${nextEpisode.episode.title}`}
            >
              <div className="ep-nav-text">
                <span className="ep-nav-hint">الحلقة التالية</span>
                <span className="ep-nav-title">
                  {nextEpisode.season.title} • {nextEpisode.episode.title}
                </span>
              </div>
              <Icon name="arrow" size={16} className="ep-nav-arrow-next" />
            </Link>
          ) : (
            <span className="ep-nav-btn is-disabled" aria-disabled="true">
              <span className="ep-nav-hint">آخر حلقة معروضة</span>
            </span>
          )}
        </div>
      </nav>

      {/* Episode Info Section */}
      <section className="watch-info-section" aria-labelledby="watch-episode-title">
        <div className="watch-info-layout">
          {series.posterUrl && (
            <Link
              href={`/series/${series.slug}`}
              className="watch-info-poster"
              aria-label={`عرض صفحة ${series.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={series.posterUrl} alt={series.title} loading="lazy" />
            </Link>
          )}

          <div className="watch-info-body">
            <div className="watch-info-header">
              <div className="watch-title-group">
                <p className="hero-english" dir="ltr">
                  {currentEpisode.originalTitle || series.englishTitle}
                </p>
                <h1 id="watch-episode-title" className="watch-title">
                  {series.title}: {currentEpisode.title}
                </h1>
                <p className="watch-subtitle">
                  {currentSeason.title} — الحلقة {currentEpisode.episodeNumber}
                </p>
              </div>

              <div className="watch-badges-row">
                <span className={`hero-audio-pill ${isDubbed ? "is-dubbed" : "is-subtitled"}`}>
                  {currentEpisode.audioBadge}
                </span>
                {currentEpisode.durationLabel && (
                  <span className="meta-pill">{currentEpisode.durationLabel}</span>
                )}
                {series.ageRating && (
                  <span className="age-badge" dir="ltr">
                    {series.ageRating}
                  </span>
                )}
              </div>
            </div>

            {(currentEpisode.description || series.description) && (
              <p className="watch-description">
                {currentEpisode.description || series.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Season & Episode Switcher Drawer */}
      <section className="watch-season-selector-section" aria-labelledby="episodes-drawer-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">استكشف باقي الحلقات</span>
            <h2 id="episodes-drawer-title">
              حلقات {series.title}
              <span style={{ color: "var(--orange)" }}>.</span>
            </h2>
          </div>
        </div>

        {/* Season Tabs */}
        {seasons.length > 1 && (
          <div className="public-seasons-nav" role="tablist" aria-label="مواسم المسلسل">
            {seasons.map((season) => {
              const isActive = season.id === activeSeason.id;
              return (
                <button
                  key={season.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`public-season-pill ${isActive ? "is-active" : ""}`}
                  onClick={() => setSelectedSeasonId(season.id)}
                >
                  <span>{season.title}</span>
                  <small>({season.episodes.length} حلقة)</small>
                </button>
              );
            })}
          </div>
        )}

        {/* Episode List Grid */}
        <div className="watch-episodes-strip">
          {activeSeason.episodes.map((ep) => {
            const isCurrent = ep.id === currentEpisode.id;
            const epIsDubbed = (ep.audioBadge || "").includes("مدبلج");
            return (
              <Link
                key={ep.id}
                href={`/watch/series/${series.slug}/${ep.slug}`}
                className={`watch-ep-card ${isCurrent ? "is-current" : ""}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                <div className="watch-ep-card-thumb">
                  {ep.stillUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ep.stillUrl} alt={ep.title} loading="lazy" />
                  ) : (
                    <div className="watch-ep-placeholder">
                      <Icon name="sparkles" size={24} />
                    </div>
                  )}
                  <span className="watch-ep-badge">حلقة {ep.episodeNumber}</span>
                  {isCurrent && <span className="watch-ep-now-playing">▶ تشاهد الآن</span>}
                </div>
                <div className="watch-ep-card-meta">
                  <h4>{ep.title}</h4>
                  <div className="watch-ep-subline">
                    <span>{ep.durationLabel}</span>
                    <span className="meta-dot" />
                    <span className={`watch-ep-audio-tag ${epIsDubbed ? "is-dubbed" : "is-subtitled"}`}>
                      {ep.audioBadge}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Related Content */}
      {related.length > 0 && (
        <section className="watch-related-section">
          <MovieRow
            id="watch-episode-related"
            title="أعمال أخرى قد تعجبك"
            eyebrow="مزيد من الحكايات"
            movies={related}
            savedIds={savedIds}
            onToggleSave={toggleSave}
          />
        </section>
      )}
    </div>
  );
}
