"use client";

import { useCallback, useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Movie } from "@/lib/movies";
import { Icon } from "./icon";
import { SceneArt } from "./illustrations";

export type HeroSliderProps = {
  slides: Movie[];
  activeIndex: number;
  savedIds: string[];
  autoPlayMs?: number;
  onSelectSlide: (index: number) => void;
  onToggleSave: (id: string) => void;
  onWatch: () => void;
};

export function HeroSlider({
  slides,
  activeIndex,
  savedIds,
  autoPlayMs = 7000,
  onSelectSlide,
  onToggleSave,
  onWatch,
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

  if (!movie) return null;

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      aria-roledescription="carousel"
      id="home"
      style={{ "--theme-accent": movie.accent } as CSSProperties}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="hero-art-stack" aria-hidden="true">
        {slides.map((slide, index) => {
          const isActive = index === safeIndex;
          return (
            <div
              key={slide.id}
              className={`hero-art ${isActive ? "is-active" : ""}`}
            >
              <SceneArt theme={slide.theme} />
            </div>
          );
        })}
      </div>

      <div
        className="hero-content"
        key={movie.id}
        aria-live={isPaused ? "polite" : "off"}
      >
        <p className="hero-english hero-stagger" dir="ltr" style={{ "--step": 0 } as CSSProperties}>
          {movie.englishTitle}
        </p>

        <h1 id="hero-title" className="hero-stagger" style={{ "--step": 1 } as CSSProperties}>
          {movie.title}
        </h1>

        <p className="hero-subtitle hero-stagger" style={{ "--step": 2 } as CSSProperties}>
          {movie.subtitle}
        </p>

        <div className="movie-meta hero-stagger" style={{ "--step": 3 } as CSSProperties}>
          <span className="meta-pill">{movie.year}</span>
          <span className="meta-dot" />
          <span className="meta-pill is-category">{movie.categoryLabel}</span>
          <span className="meta-dot" />
          <span>{movie.duration}</span>
          <span className="age-badge" dir="ltr">
            6+
          </span>
        </div>

        <p className="hero-description hero-stagger" style={{ "--step": 4 } as CSSProperties}>
          {movie.description}
        </p>

        <div className="hero-actions hero-stagger" style={{ "--step": 5 } as CSSProperties}>
          <button type="button" className="primary-button" onClick={onWatch}>
            <span className="play-icon-wrap">
              <Icon name="play" size={20} />
            </span>
            <span>اكتشف الحكاية</span>
          </button>

          <button
            type="button"
            className={`save-button ${isSaved ? "is-saved" : ""}`}
            aria-label={isSaved ? "إزالة الحكاية من قائمتي" : "إضافة الحكاية إلى قائمتي"}
            aria-pressed={isSaved}
            onClick={() => onToggleSave(movie.id)}
          >
            <Icon name={isSaved ? "check" : "plus"} />
          </button>

          <span className={`save-status ${isSaved ? "is-visible" : ""}`} role="status">
            {isSaved ? "✦ أُضيفت إلى قائمتك لهذه الجلسة" : ""}
          </span>
        </div>

        <div className="hero-footnote hero-stagger" style={{ "--step": 6 } as CSSProperties}>
          <span className="rating">
            <Icon name="star" size={15} />
            <b dir="ltr">{movie.rating}</b>
          </span>
          <span>خيال بلا حدود</span>
          <span className="meta-dot" />
          <span>متعة لكل العائلة</span>
        </div>
      </div>

      <div className="hero-pagination" role="group" aria-label="التنقل بين الحكايات المميزة">
        <span className="slide-count" dir="ltr">
          <b>0{safeIndex + 1}</b> / 0{count}
        </span>

        <div className="hero-indicators">
          {slides.map((item, i) => {
            const isActive = i === safeIndex;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`عرض ${item.title}`}
                aria-pressed={isActive}
                className={`hero-indicator-btn ${isActive ? "active" : ""}`}
                onClick={() => onSelectSlide(i)}
              />
            );
          })}
        </div>

        <span className="pagination-line" aria-hidden="true" />

        <div className="hero-nav-arrows">
          <button
            type="button"
            className="hero-arrow-btn"
            onClick={handlePrev}
            aria-label="الحكاية السابقة"
          >
            <Icon name="arrow" size={15} style={{ rotate: "180deg" }} />
          </button>
          <button
            type="button"
            className="hero-arrow-btn"
            onClick={handleNext}
            aria-label="الحكاية التالية"
          >
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>

      <span className="original-art-note">رسومات وحكايات تجريبية</span>
    </section>
  );
}
