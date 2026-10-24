"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { Movie } from "@/lib/movies";
import { Icon } from "./icon";
import { SceneArt } from "./illustrations";

export type MovieCardProps = {
  movie: Movie;
  isSelected?: boolean;
  isSaved?: boolean;
};

export function MovieCard({
  movie,
  isSelected = false,
  isSaved = false,
}: MovieCardProps) {
  const categoriesSummary =
    movie.categoryLabels && movie.categoryLabels.length > 0
      ? movie.categoryLabels.slice(0, 2).join(" · ")
      : movie.categoryLabel;

  return (
    <Link
      href={`/movies/${movie.slug}`}
      style={{ "--card-accent": movie.accent } as CSSProperties}
      className={`movie-card group ${isSelected ? "is-featured" : ""}`}
      aria-label={`${movie.title} — ${categoriesSummary} (${movie.year}) — ${movie.audioBadge}`}
    >
      <div className="poster">
        {movie.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="poster-real-img scene-art"
            loading="lazy"
          />
        ) : (
          <SceneArt theme={movie.theme} compact />
        )}

        <span className="poster-category">{movie.categoryLabel}</span>

        <span
          className={`poster-audio-badge ${
            movie.audioBadge === "مدبلج" ? "is-dubbed" : "is-subtitled"
          }`}
        >
          {movie.audioBadge}
        </span>

        {isSaved && (
          <span className="poster-saved-badge" title="محفوظة في قائمتي">
            <Icon name="heart" size={12} />
          </span>
        )}

        <div className="poster-hover-overlay" aria-hidden="true">
          <div className="poster-hover-actions">
            <span className="poster-action-btn is-watch" title="مشاهدة الآن">
              <Icon name="play" size={18} />
            </span>
            <span className="poster-action-btn is-details" title="تفاصيل الحكاية">
              <Icon name="sparkles" size={16} />
            </span>
          </div>
        </div>

        <span className="poster-title">
          {movie.title}
          <small>{movie.subtitle}</small>
        </span>
      </div>

      <span className="card-details">
        <span className="card-details-main">
          <span className="card-title-text">{movie.title}</span>
          <small>
            {movie.year} <span>•</span> {categoriesSummary} <span>•</span> {movie.audioBadge}
          </small>
        </span>
        <span className="card-rating" aria-label={`التقييم ${movie.rating}`}>
          <Icon name="star" size={12} />
          {movie.rating}
        </span>
      </span>
    </Link>
  );
}
