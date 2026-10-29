"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent } from "react";
import { getContentHref } from "@/lib/content-links";
import type { Movie } from "@/lib/movies";
import { Icon } from "./icon";
import { PublishedArtwork } from "./published-artwork";

export type MovieCardProps = {
  movie: Movie;
  isSelected?: boolean;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
};

export function MovieCard({
  movie,
  isSelected = false,
  isSaved = false,
  onToggleSave,
}: MovieCardProps) {
  const router = useRouter();
  const categoriesSummary =
    movie.categoryLabels && movie.categoryLabels.length > 0
      ? movie.categoryLabels.slice(0, 2).join(" · ")
      : movie.categoryLabel;
  const metadata = [movie.year, categoriesSummary, movie.audioBadge].filter(Boolean);

  const detailsHref = getContentHref(movie);
  const watchHref =
    movie.format === "series"
      ? `/watch/series/${movie.slug}`
      : `/watch/movies/${movie.slug}`;

  const handleQuickWatch = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(watchHref);
  };

  const handleToggleSaveClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave?.(movie.id);
  };

  return (
    <Link
      href={detailsHref}
      style={{ "--card-accent": movie.accent } as CSSProperties}
      className={`movie-card group ${isSelected ? "is-featured" : ""}`}
      aria-label={[movie.title, ...metadata].join(" — ")}
    >
      <div className="poster">
        <PublishedArtwork src={movie.posterUrl} className="poster-real-img scene-art" />

        {movie.categoryLabel && (
          <span className="poster-category">{movie.categoryLabel}</span>
        )}

        {movie.audioBadge && (
          <span
            className={`poster-audio-badge ${
              movie.audioBadge === "مدبلج" ? "is-dubbed" : "is-subtitled"
            }`}
          >
            {movie.audioBadge}
          </span>
        )}

        {onToggleSave ? (
          <button
            type="button"
            className={`poster-save-btn ${isSaved ? "is-saved" : ""}`}
            onClick={handleToggleSaveClick}
            aria-label={isSaved ? `إزالة ${movie.title} من قائمتي` : `إضافة ${movie.title} إلى قائمتي`}
            aria-pressed={isSaved}
            title={isSaved ? "محفوظة في قائمتي (اضغط للإزالة)" : "حفظ في قائمتي"}
          >
            <Icon name={isSaved ? "heartFilled" : "heart"} size={14} />
          </button>
        ) : (
          isSaved && (
            <span className="poster-saved-badge" title="محفوظة في قائمتي">
              <Icon name="heartFilled" size={12} />
            </span>
          )
        )}

        <div className="poster-hover-overlay" aria-hidden="true">
          <div className="poster-hover-actions">
            <button
              type="button"
              className="poster-action-btn is-watch"
              onClick={handleQuickWatch}
              title={`تشغيل الآن: ${movie.title}`}
              aria-label={`تشغيل الآن: ${movie.title}`}
              tabIndex={-1}
            >
              <Icon name="play" size={18} />
            </button>
          </div>
        </div>

        <span className="poster-title">
          {movie.title}
          {movie.subtitle && <small>{movie.subtitle}</small>}
        </span>
      </div>

      <span className="card-details">
        <span className="card-details-main">
          <span className="card-title-text">{movie.title}</span>
          {metadata.length > 0 && <small>{metadata.join(" • ")}</small>}
        </span>
        {movie.rating && (
          <span className="card-rating" aria-label={`التقييم ${movie.rating}`}>
            <Icon name="star" size={11} />
            {movie.rating}
          </span>
        )}
      </span>
    </Link>
  );
}
