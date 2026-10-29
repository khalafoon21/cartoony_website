"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { MovieRow } from "@/components/movie-row";
import { VideoPlayer } from "@/components/video-player";
import { useWatchlist } from "@/lib/use-watchlist";
import type { Movie } from "@/lib/movies";

export type MovieWatchViewProps = {
  movie: Movie;
  related: Movie[];
};

export function MovieWatchView({ movie, related }: MovieWatchViewProps) {
  const { savedIds, toggleSave } = useWatchlist();
  const [copiedLink, setCopiedLink] = useState(false);

  const saved = savedIds.includes(movie.id);
  const isDubbed = movie.audioBadge.includes("مدبلج");

  const categoryBadges =
    movie.categoryLabels && movie.categoryLabels.length > 0
      ? movie.categoryLabels
      : [movie.categoryLabel];

  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: `مشاهدة ${movie.title} | كارتوني`,
          text: movie.description,
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
          <Link href={`/movies/${movie.slug}`} className="watch-back-link">
            <Icon name="arrow" size={16} />
            <span>العودة لصفحة الفيلم</span>
          </Link>
          <div className="watch-breadcrumb" aria-label="مسار الصفحة">
            <Link href="/movies">الأفلام</Link>
            <span className="meta-dot" />
            <span className="current">{movie.title}</span>
          </div>
        </div>

        <div className="watch-top-actions">
          <button
            type="button"
            className={`watch-action-pill ${saved ? "is-saved" : ""}`}
            onClick={() => toggleSave(movie.id)}
            aria-pressed={saved}
          >
            <Icon name={saved ? "heartFilled" : "heart"} size={14} />
            <span>{saved ? "في قائمتي" : "حفظ في قائمتي"}</span>
          </button>

          <button
            type="button"
            className="watch-action-pill"
            onClick={handleShare}
            title="مشاركة رابط المشاهدة"
          >
            <Icon name={copiedLink ? "check" : "share"} size={14} />
            <span>{copiedLink ? "تم النسخ" : "مشاركة"}</span>
          </button>
        </div>
      </div>

      {/* Clean Video Player Frame */}
      <div className="watch-player-frame">
        {movie.videoUrl ? (
          <VideoPlayer
            src={movie.videoUrl}
            poster={movie.backdropUrl || movie.posterUrl}
            title={movie.title}
            subtitleUrl={movie.subtitleUrl}
            subtitleLang={movie.subtitleLang}
            accentColor={movie.accent}
            contentId={movie.id}
            contentType="movie"
            videoType={movie.videoType}
            servers={movie.servers}
          />
        ) : (
          <div className="watch-unavailable-card">
            <div className="unavailable-icon-bubble">
              <Icon name="sparkles" size={40} />
            </div>
            <h2>الفيديو غير متاح للمشاهدة الآن</h2>
            <p>
              لم تتم إضافة رابط تشغيل مباشر لهذا الفيلم بعد. نعمل دائماً على تحديث
              المكتبة وإضافة محتوى مرخص وجديد.
            </p>
            <div className="unavailable-actions">
              <Link href={`/movies/${movie.slug}`} className="primary-button">
                <Icon name="sparkles" size={16} />
                <span>عرض تفاصيل الفيلم</span>
              </Link>
              <Link href="/movies" className="text-button">
                <span>تصفح باقي الأفلام</span>
                <Icon name="arrow" size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Clean Movie Info Card */}
      <section className="watch-info-section" aria-labelledby="watch-movie-title">
        <div className="watch-info-layout">
          {movie.posterUrl && (
            <Link
              href={`/movies/${movie.slug}`}
              className="watch-info-poster"
              aria-label={`عرض صفحة ${movie.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
            </Link>
          )}

          <div className="watch-info-body">
            <div className="watch-info-header">
              <div className="watch-title-group">
                <p className="hero-english" dir="ltr">
                  {movie.englishTitle}
                </p>
                <h1 id="watch-movie-title" className="watch-title">
                  {movie.title}
                </h1>
                {movie.subtitle && <p className="watch-subtitle">{movie.subtitle}</p>}
              </div>

              <div className="watch-badges-row">
                <span className={`hero-audio-pill ${isDubbed ? "is-dubbed" : "is-subtitled"}`}>
                  {movie.audioBadge}
                </span>
                {movie.rating && (
                  <span className="hero-rating-chip" dir="ltr">
                    <Icon name="star" size={13} />
                    <span>{movie.rating}</span>
                  </span>
                )}
                <span className="meta-pill">{movie.year}</span>
                {categoryBadges.map((cat) => (
                  <span key={cat} className="meta-pill is-category">
                    {cat}
                  </span>
                ))}
                {movie.duration && <span className="meta-pill">{movie.duration}</span>}
                {movie.ageRating && (
                  <span className="age-badge" dir="ltr">
                    {movie.ageRating}
                  </span>
                )}
              </div>
            </div>

            <p className="watch-description">{movie.description}</p>
          </div>
        </div>
      </section>

      {/* Related Content */}
      {related.length > 0 && (
        <section className="watch-related-section">
          <MovieRow
            id="watch-movie-related"
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
