"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { getContentHref } from "@/lib/content-links";
import type { Movie } from "@/lib/movies";
import { Icon } from "./icon";
import { PublishedArtwork } from "./published-artwork";

export type HeroSliderProps = {
  slides: Movie[];
  activeIndex: number;
  savedIds: string[];
  autoPlayMs?: number;
  onSelectSlide: (index: number) => void;
  onToggleSave: (id: string) => void;
  errorMessage?: string;
};

export function HeroSlider({
  slides,
  activeIndex,
  savedIds,
  autoPlayMs = 8000,
  onSelectSlide,
  onToggleSave,
  errorMessage,
}: HeroSliderProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = slides.length;
  const safeIndex = count > 0 ? ((activeIndex % count) + count) % count : 0;
  const movie = slides[safeIndex];
  const isSaved = movie ? savedIds.includes(movie.id) : false;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleNext = useCallback(() => {
    if (count <= 1) return;
    onSelectSlide((safeIndex + 1) % count);
  }, [count, onSelectSlide, safeIndex]);

  const handlePrev = useCallback(() => {
    if (count <= 1) return;
    onSelectSlide((safeIndex - 1 + count) % count);
  }, [count, onSelectSlide, safeIndex]);

  useEffect(() => {
    if (isPaused || reducedMotion || count <= 1) return;
    const timer = window.setInterval(() => {
      onSelectSlide((safeIndex + 1) % count);
    }, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [autoPlayMs, count, isPaused, onSelectSlide, reducedMotion, safeIndex]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handlePrev();
      }
    },
    [handleNext, handlePrev]
  );

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!movie) {
    return (
      <section className="hero hero-empty" id="home" aria-labelledby="hero-title">
        <div className="hero-art-stack" aria-hidden="true">
          <div className="hero-art is-active">
            <PublishedArtwork className="hero-real-backdrop" />
          </div>
        </div>
        <div className="hero-content">
          <p className="eyebrow">أهلاً بك في كارتوني</p>
          <h1 id="hero-title">لكل عالم حكاية</h1>
          <div
            className={`hero-empty-message ${errorMessage ? "is-error" : ""}`}
            role={errorMessage ? "alert" : "status"}
          >
            <p>{errorMessage ? "تعذّر تحميل الحكايات الآن" : "لا توجد حكايات منشورة حالياً"}</p>
            <span>{errorMessage || "تظهر الحكايات هنا عند نشرها."}</span>
          </div>
        </div>
      </section>
    );
  }

  const watchHref =
    movie.format === "series"
      ? `/watch/series/${movie.slug}`
      : `/watch/movies/${movie.slug}`;
  const detailsHref = getContentHref(movie);

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      aria-roledescription="carousel"
      id="home"
      style={
        {
          "--theme-accent": movie.accent,
        } as CSSProperties
      }
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hero-art-stack" aria-hidden="true">
        {slides.map((slide, index) => {
          const isActive = index === safeIndex;
          return (
            <div key={slide.id} className={`hero-art ${isActive ? "is-active" : ""}`}>
              <PublishedArtwork
                src={slide.backdropUrl || slide.posterUrl}
                className="hero-real-backdrop"
                eager={index === safeIndex}
              />
            </div>
          );
        })}
      </div>

      <div
        className="hero-content"
        key={movie.id}
        aria-live={isPaused ? "polite" : "off"}
      >
        <div className="hero-top-badges hero-stagger" style={{ "--step": 0 } as CSSProperties}>
          <span className="hero-format-badge">
            <Icon name={movie.format === "series" ? "tv" : "film"} size={13} />
            <span>{movie.format === "series" ? "مسلسل كرتوني" : "فيلم سينمائي"}</span>
          </span>
          {movie.audioBadge && (
            <span
              className={`hero-audio-pill ${
                movie.audioBadge === "مدبلج" ? "is-dubbed" : "is-subtitled"
              }`}
            >
              {movie.audioBadge}
            </span>
          )}
          {movie.rating && (
            <span className="hero-rating-chip" aria-label={`التقييم ${movie.rating}`}>
              <Icon name="star" size={13} />
              <b dir="ltr">{movie.rating}</b>
            </span>
          )}
        </div>

        {movie.englishTitle && (
          <p className="hero-english hero-stagger" dir="ltr" style={{ "--step": 1 } as CSSProperties}>
            {movie.englishTitle}
          </p>
        )}

        <h1 id="hero-title" className="hero-stagger" style={{ "--step": 2 } as CSSProperties}>
          {movie.title}
        </h1>

        {movie.subtitle && (
          <p className="hero-subtitle hero-stagger" style={{ "--step": 3 } as CSSProperties}>
            {movie.subtitle}
          </p>
        )}

        <div className="movie-meta hero-stagger" style={{ "--step": 4 } as CSSProperties}>
          {Boolean(movie.year) && <span className="meta-pill">{movie.year}</span>}
          {movie.categoryLabel && <span className="meta-pill is-category">{movie.categoryLabel}</span>}
          {movie.duration && <span className="meta-pill is-duration">{movie.duration}</span>}
          {movie.ageRating && (
            <span className="age-badge" dir="ltr">
              {movie.ageRating}
            </span>
          )}
        </div>

        {movie.description && (
          <p className="hero-description hero-stagger" style={{ "--step": 5 } as CSSProperties}>
            {movie.description}
          </p>
        )}

        <div className="hero-actions hero-stagger" style={{ "--step": 6 } as CSSProperties}>
          <Link
            className="primary-button is-watch-now"
            href={watchHref}
            aria-label={`مشاهدة الآن: ${movie.title}`}
          >
            <span className="play-icon-wrap">
              <Icon name="play" size={19} />
            </span>
            <span>مشاهدة الآن</span>
          </Link>

          <Link
            className="secondary-button is-details-btn"
            href={detailsHref}
            aria-label={`تفاصيل: ${movie.title}`}
            title="التفاصيل"
          >
            <Icon name="info" size={20} />
          </Link>

          <button
            type="button"
            className={`save-button ${isSaved ? "is-saved" : ""}`}
            aria-label={isSaved ? "إزالة الحكاية من قائمتي" : "إضافة الحكاية إلى قائمتي"}
            aria-pressed={isSaved}
            onClick={() => onToggleSave(movie.id)}
            title={isSaved ? "محفوظة في قائمتي" : "حفظ في قائمتي"}
          >
            <Icon name={isSaved ? "heartFilled" : "heart"} size={20} />
          </button>

          <span className={`save-status ${isSaved ? "is-visible" : ""}`} role="status">
            {isSaved ? "✦ محفوظة في قائمتك المفضلة" : ""}
          </span>
        </div>
      </div>

    </section>
  );
}
