"use client";

import Link from "next/link";
import { useCallback, useRef, type KeyboardEvent } from "react";
import type { Movie } from "@/lib/movies";
import { Icon } from "./icon";
import { MovieCard } from "./movie-card";

export type MovieRowProps = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  movies: Movie[];
  savedIds?: string[];
  featuredId?: string;
  viewAllHref?: string;
  emptyMessage?: string;
  errorMessage?: string;
};

export function MovieRow({
  id,
  eyebrow,
  title,
  subtitle,
  movies,
  savedIds = [],
  featuredId,
  viewAllHref,
  emptyMessage = "لا توجد عروض منشورة في هذا القسم حالياً.",
  errorMessage,
}: MovieRowProps) {
  const trackRef = useRef<HTMLUListElement>(null);

  const handleScroll = useCallback((direction: "next" | "prev") => {
    const track = trackRef.current;
    if (!track) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const step = Math.max(track.clientWidth * 0.72, 260);
    // In RTL, scrolling further down the list ("next") moves left (negative left offset)
    const delta = direction === "next" ? -step : step;

    track.scrollBy({
      left: delta,
      behavior: prefersReducedMotion ? "instant" : "smooth",
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLUListElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const links = trackRef.current?.querySelectorAll<HTMLAnchorElement>(
        "a.movie-card"
      );
      if (!links || links.length === 0) return;

      const currentIndex = Array.from(links).indexOf(
        document.activeElement as HTMLAnchorElement
      );
      if (currentIndex === -1) return;

      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? 1 : -1;
      const nextIndex = Math.min(
        Math.max(currentIndex + delta, 0),
        links.length - 1
      );
      links[nextIndex]?.focus();
    },
    []
  );

  const headingId = `${id}-heading`;

  return (
    <section
      className="movie-row-section content-section"
      id={id}
      aria-labelledby={headingId}
    >
      <div className="section-heading movie-row-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={headingId}>
            {title}
            <span>.</span>
          </h2>
          {subtitle && <p className="section-note">{subtitle}</p>}
        </div>

        <div className="movie-row-controls" role="group" aria-label={`تحريك قسم ${title}`}>
          {viewAllHref && (
            <Link href={viewAllHref} className="text-button">
              <span>كل الأفلام</span>
              <Icon name="arrow" size={14} />
            </Link>
          )}
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={() => handleScroll("prev")}
            aria-label={`السابق في ${title}`}
          >
            <Icon name="arrow" size={16} style={{ rotate: "180deg" }} />
          </button>
          <button
            type="button"
            className="carousel-arrow-btn"
            onClick={() => handleScroll("next")}
            aria-label={`التالي في ${title}`}
          >
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="public-state-box is-error" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : movies.length === 0 ? (
        <div className="public-state-box" role="status">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <ul
          ref={trackRef}
          role="list"
          className="movie-carousel-track"
          onKeyDown={handleKeyDown}
        >
          {movies.map((movie) => (
            <li key={movie.id} className="movie-carousel-item">
              <MovieCard
                movie={movie}
                isSelected={featuredId === movie.id}
                isSaved={savedIds.includes(movie.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
