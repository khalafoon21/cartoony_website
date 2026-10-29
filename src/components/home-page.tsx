"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { HomepageSectionConfig, Movie } from "@/lib/movies";
import { useWatchlist } from "@/lib/use-watchlist";
import { CategoryStrip } from "./category-strip";
import { HeroSlider } from "./hero-slider";
import { Icon } from "./icon";
import { MovieRow } from "./movie-row";

type QuickFilterKey = "all" | "movie" | "series" | "dubbed" | "subtitled" | "saved";

const QUICK_FILTERS: Array<{
  key: QuickFilterKey;
  label: string;
}> = [
  { key: "all", label: "الكل" },
  { key: "movie", label: "أفلام" },
  { key: "series", label: "مسلسلات" },
  { key: "dubbed", label: "مدبلج عربي" },
  { key: "subtitled", label: "مترجم" },
];

function matchesQuickFilter(movie: Movie, filter: QuickFilterKey, savedIds: string[]): boolean {
  switch (filter) {
    case "all":
      return true;
    case "movie":
      return movie.format === "movie";
    case "series":
      return movie.format === "series";
    case "dubbed":
      return movie.audioBadge === "مدبلج";
    case "subtitled":
      return movie.audioBadge === "مترجم";
    case "saved":
      return savedIds.includes(movie.id);
  }
}

function CompactWorldsStrip({
  slides,
  selected,
  onSelect,
}: {
  slides: Movie[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  if (slides.length <= 1) return null;

  return (
    <section className="franchises" id="franchises" aria-label="عوالم كارتوني المميزة">
      <div className="franchises-bar-header">
        <span className="franchises-bar-label">
          <Icon name="sparkles" size={14} />
          <span>عوالم العرض المميز</span>
        </span>
        <span className="franchises-bar-hint">اختر حكاية لتبديل مسرح العرض</span>
      </div>
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
  allMovies = [],
  dbError,
}: {
  sections: HomepageSectionConfig[];
  heroSlides: Movie[];
  allMovies?: Movie[];
  dbError?: string;
}) {
  const [selected, setSelected] = useState(0);
  const [activeFilter, setActiveFilter] = useState<QuickFilterKey>("all");
  const { savedIds, toggleSave, clearWatchlist } = useWatchlist();

  const safeIndex =
    heroSlides.length > 0
      ? ((selected % heroSlides.length) + heroSlides.length) % heroSlides.length
      : 0;
  const currentMovie = heroSlides[safeIndex] ?? null;

  // Build deduplicated pool of all known movies/series for resolving saved items
  const catalogPool = useMemo(() => {
    const map = new Map<string, Movie>();
    for (const item of allMovies) map.set(item.id, item);
    for (const item of heroSlides) map.set(item.id, item);
    for (const sec of sections) {
      for (const item of sec.items) map.set(item.id, item);
    }
    return Array.from(map.values());
  }, [allMovies, heroSlides, sections]);

  const savedMovies = useMemo(() => {
    if (savedIds.length === 0) return [];
    const byId = new Map(catalogPool.map((m) => [m.id, m]));
    return savedIds.map((id) => byId.get(id)).filter((m): m is Movie => Boolean(m));
  }, [catalogPool, savedIds]);

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          matchesQuickFilter(item, activeFilter, savedIds)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, activeFilter, savedIds]);

  const filteredFallbackItems = useMemo(() => {
    if (activeFilter === "all") return [];
    return catalogPool.filter((item) => matchesQuickFilter(item, activeFilter, savedIds));
  }, [catalogPool, activeFilter, savedIds]);

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
          onToggleSave={toggleSave}
          onSelectSlide={setSelected}
          errorMessage={dbError}
        />

        <CompactWorldsStrip slides={heroSlides} selected={safeIndex} onSelect={setSelected} />

        <CategoryStrip />

        {/* Smart Instant Filter Bar */}
        {catalogPool.length > 0 && (
          <section className="homepage-quick-filter-section content-section" aria-label="تصفية سريعة للعروض">
            <div className="quick-filter-bar">
              <div className="quick-filter-pills" role="tablist" aria-label="فلترة العروض حسب النوع">
                {QUICK_FILTERS.map((f) => {
                  const isActive = activeFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`quick-filter-pill ${isActive ? "is-active" : ""}`}
                      onClick={() => setActiveFilter(f.key)}
                    >
                      <span>{f.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === "saved"}
                  className={`quick-filter-pill is-watchlist-pill ${
                    activeFilter === "saved" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveFilter(activeFilter === "saved" ? "all" : "saved")}
                >
                  <Icon name={savedMovies.length > 0 ? "heartFilled" : "heart"} size={13} />
                  <span>قائمتي المفضلة</span>
                  {savedMovies.length > 0 && (
                    <span className="quick-filter-count">{savedMovies.length}</span>
                  )}
                </button>
              </div>

              {activeFilter !== "all" && (
                <button
                  type="button"
                  className="quick-filter-reset"
                  onClick={() => setActiveFilter("all")}
                >
                  <span>إعادة ضبط الفلتر</span>
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
          </section>
        )}

        {dbError && heroSlides.length > 0 && (
          <div className="content-section">
            <div className="public-state-box is-error" role="alert">
              <p>{dbError}</p>
            </div>
          </div>
        )}

        <div id="stories" className="homepage-rows-stack">
          {/* Persistent Watchlist Section (#saved) */}
          <div id="saved">
            {savedMovies.length > 0 ? (
              <MovieRow
                id="watchlist-row"
                eyebrow="مكتبتك الخاصة"
                title="قائمتي المفضلة"
                subtitle="الأعمال التي حفظتها للعودة إليها ومشاهدتها في أي وقت"
                movies={savedMovies}
                savedIds={savedIds}
                onToggleSave={toggleSave}
                featuredId={currentMovie?.id}
                badgeCount={savedMovies.length}
                onClearAll={clearWatchlist}
              />
            ) : activeFilter === "saved" ? (
              <section className="movie-row-section content-section">
                <div className="watchlist-empty-card">
                  <div className="watchlist-empty-icon">
                    <Icon name="heart" size={24} />
                  </div>
                  <div className="watchlist-empty-text">
                    <h3>قائمتك المفضلة فارغة حالياً</h3>
                    <p>اضغط على أيقونة القلب ♥ على أي فيلم أو مسلسل لحفظه هنا والوصول إليه سريعاً في أي وقت.</p>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setActiveFilter("all")}
                  >
                    <span>استكشف كل العروض</span>
                  </button>
                </div>
              </section>
            ) : null}
          </div>

          {activeFilter !== "saved" &&
            (filteredSections.length > 0 ? (
              filteredSections.map((section) => {
                const viewAllHref =
                  section.id === "cartoon-movies"
                    ? "/movies"
                    : section.id === "cartoon-series"
                    ? "/series"
                    : undefined;
                const viewAllLabel =
                  section.id === "cartoon-movies"
                    ? "كل الأفلام"
                    : section.id === "cartoon-series"
                    ? "كل المسلسلات"
                    : "عرض الكل";

                return (
                  <MovieRow
                    key={section.id}
                    id={section.id}
                    eyebrow={section.eyebrow}
                    title={section.title}
                    subtitle={section.subtitle}
                    movies={section.items}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                    featuredId={currentMovie?.id}
                    viewAllHref={viewAllHref}
                    viewAllLabel={viewAllLabel}
                  />
                );
              })
            ) : filteredFallbackItems.length > 0 ? (
              <MovieRow
                id="filtered-results"
                eyebrow="نتائج الفلترة"
                title="العروض المطابقة لاختيارك"
                movies={filteredFallbackItems}
                savedIds={savedIds}
                onToggleSave={toggleSave}
                featuredId={currentMovie?.id}
              />
            ) : (
              <section className="movie-row-section content-section">
                <div className="public-state-box" role="status">
                  <p>لا توجد عروض مطابقة لهذا الفلتر حالياً.</p>
                </div>
              </section>
            ))}
        </div>

        <footer className="site-footer">
          <span>
            كارتوني<span className="footer-dot">.</span> <small>لكل حكاية عالم</small>
          </span>
          <p>
            صُنع بشغف للخيال <Icon name="heartFilled" size={13} />
          </p>
          <a href="#home" className="footer-top-link">
            إلى الأعلى ↑
          </a>
        </footer>
      </main>
    </>
  );
}
