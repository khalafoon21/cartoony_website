"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import {
  homepageSections,
  movies,
  type HomepageSectionConfig,
} from "@/lib/movies";
import { closeTopLayer } from "@/lib/top-layer";
import { CategoryStrip } from "./category-strip";
import { HeroSlider } from "./hero-slider";
import { Icon } from "./icon";
import { SceneArt } from "./illustrations";
import { MovieRow } from "./movie-row";

function FranchiseRow({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="franchises" id="franchises" aria-label="عوالم كارتوني">
      <div className="franchise-track">
        {movies.map((movie, index) => {
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
                {["✦", "◌", "≋", "☀", "☁"][index]}
              </span>
              <span className="franchise-title">{movie.franchise}</span>
              <span className="franchise-english" dir="ltr">
                {movie.englishTitle}
              </span>
              <span className="franchise-torch" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function HomePage({
  sections = homepageSections,
  dbError,
}: {
  sections?: HomepageSectionConfig[];
  dbError?: string;
} = {}) {
  const [selected, setSelected] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const previewRef = useRef<HTMLDialogElement>(null);

  const handleToggleSave = useCallback((id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleClosePreview = useCallback(() => {
    closeTopLayer(previewRef.current);
  }, []);

  const currentMovie = movies[selected];

  return (
    <>
      <a className="skip-link" href="#main-content">
        انتقل إلى المحتوى
      </a>
      <main id="main-content" className="site-main" tabIndex={-1}>
        <HeroSlider
          slides={movies}
          activeIndex={selected}
          savedIds={savedIds}
          onToggleSave={handleToggleSave}
          onSelectSlide={setSelected}
          onWatch={() => previewRef.current?.showModal()}
        />
        <FranchiseRow selected={selected} onSelect={setSelected} />
        <CategoryStrip />

        <div id="stories" className="homepage-rows-stack">
          {sections.map((section) => (
            <MovieRow
              key={section.id}
              id={section.id}
              eyebrow={section.eyebrow}
              title={section.title}
              subtitle={section.subtitle}
              movies={section.items}
              savedIds={savedIds}
              featuredId={currentMovie.id}
              viewAllHref={section.id === "cartoon-movies" ? "/movies" : undefined}
              errorMessage={section.id === "cartoon-movies" ? dbError : undefined}
              emptyMessage={
                section.id === "cartoon-movies"
                  ? "لا توجد أفلام منشورة في قاعدة البيانات حالياً."
                  : undefined
              }
            />
          ))}
        </div>

        <footer className="site-footer">
          <span>
            كارتوني<span className="footer-dot">.</span> <small>لكل حكاية عالم</small>
          </span>
          <p>
            صُنع بشغف للخيال <Icon name="heart" size={13} />{" "}
            <span>واجهة تجريبية · المرحلة الأولى</span>
          </p>
          <a href="#home" className="footer-top-link">
            إلى الأعلى ↑
          </a>
        </footer>
      </main>

      <dialog
        ref={previewRef}
        className="preview-dialog"
        aria-labelledby="preview-title"
        style={{ "--theme-accent": currentMovie.accent } as CSSProperties}
        onCancel={(event) => {
          event.preventDefault();
          handleClosePreview();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) handleClosePreview();
        }}
      >
        <button
          type="button"
          className="icon-button dialog-close"
          onClick={handleClosePreview}
          aria-label="إغلاق"
        >
          <Icon name="close" />
        </button>

        <div className="preview-banner">
          <SceneArt theme={currentMovie.theme} compact />
          <span className="preview-banner-badge">{currentMovie.categoryLabel}</span>
        </div>

        <span className="eyebrow">من عالم كارتوني · {currentMovie.franchise}</span>
        <h2 id="preview-title">{currentMovie.title}</h2>
        <p className="preview-subtitle">{currentMovie.subtitle}</p>

        <div className="preview-meta">
          <span>{currentMovie.year}</span>
          <span className="meta-dot" />
          <span>{currentMovie.duration}</span>
          <span className="meta-dot" />
          <span className="rating">
            <Icon name="star" size={14} />
            <b dir="ltr">{currentMovie.rating}</b>
          </span>
        </div>

        <p>{currentMovie.description}</p>

        <div className="preview-notice">
          <Icon name="sparkles" size={18} />
          <span>هذه حكاية تجريبية لعرض التصميم السينمائي. المشاهدة الحية ستتوفر في المرحلة القادمة.</span>
        </div>

        <button type="button" className="primary-button" onClick={handleClosePreview}>
          <span>العودة إلى الحكايات</span>
          <Icon name="arrow" size={18} />
        </button>
      </dialog>
    </>
  );
}
