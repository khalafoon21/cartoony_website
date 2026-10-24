"use client";

import { useCallback, useState, type CSSProperties } from "react";
import type { HomepageSectionConfig, Movie } from "@/lib/movies";
import { CategoryStrip } from "./category-strip";
import { HeroSlider } from "./hero-slider";
import { Icon } from "./icon";
import { MovieRow } from "./movie-row";

function FranchiseRow({
  slides,
  selected,
  onSelect,
}: {
  slides: Movie[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  if (slides.length === 0) return null;

  return (
    <section className="franchises" id="franchises" aria-label="عوالم كارتوني">
      <div
        className="franchise-track published-franchise-track"
        style={{ "--franchise-count": slides.length } as CSSProperties}
      >
        {slides.map((movie, index) => {
          const isSelected = selected === index;
          return (
            <button
              key={movie.id}
              type="button"
              style={{ "--franchise-accent": movie.accent } as CSSProperties}
              className={`franchise franchise-${movie.theme} ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(index)}
              aria-pressed={isSelected}
            >
              <span className="franchise-glow" aria-hidden="true" />
              <span className="franchise-star" aria-hidden="true">
                {["✦", "◌", "≋", "☀", "☁"][index % 5]}
              </span>
              <span className="franchise-title">{movie.franchise || movie.title}</span>
              {movie.englishTitle && (
                <span className="franchise-english" dir="ltr">
                  {movie.englishTitle}
                </span>
              )}
              <span className="franchise-torch" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function HomePage({
  sections,
  heroSlides,
  dbError,
}: {
  sections: HomepageSectionConfig[];
  heroSlides: Movie[];
  dbError?: string;
}) {
  const [selected, setSelected] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const handleToggleSave = useCallback((id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const safeIndex = heroSlides.length > 0
    ? ((selected % heroSlides.length) + heroSlides.length) % heroSlides.length
    : 0;
  const currentMovie = heroSlides[safeIndex] ?? null;
  const visibleSections = sections.filter((section) => section.items.length > 0);

  return (
    <>
      <a className="skip-link" href="#main-content">
        انتقل إلى المحتوى
      </a>
      <main id="main-content" className="site-main" tabIndex={-1}>
        <HeroSlider
          slides={heroSlides}
          activeIndex={safeIndex}
          savedIds={savedIds}
          onToggleSave={handleToggleSave}
          onSelectSlide={setSelected}
          errorMessage={dbError}
        />
        <FranchiseRow slides={heroSlides} selected={safeIndex} onSelect={setSelected} />
        <CategoryStrip />

        {dbError && heroSlides.length > 0 && (
          <div className="content-section">
            <div className="public-state-box is-error" role="alert"><p>{dbError}</p></div>
          </div>
        )}

          <div id="stories" className="homepage-rows-stack">
            {visibleSections.map((section) => (
              <MovieRow
                key={section.id}
                id={section.id}
                eyebrow={section.eyebrow}
                title={section.title}
                subtitle={section.subtitle}
                movies={section.items}
                savedIds={savedIds}
                featuredId={currentMovie?.id}
                viewAllHref={section.id === "cartoon-movies" ? "/movies" : undefined}
              />
            ))}
          </div>

        <footer className="site-footer">
          <span>
            كارتوني<span className="footer-dot">.</span> <small>لكل حكاية عالم</small>
          </span>
          <p>
            صُنع بشغف للخيال <Icon name="heart" size={13} />
          </p>
          <a href="#home" className="footer-top-link">
            إلى الأعلى ↑
          </a>
        </footer>
      </main>
    </>
  );
}
