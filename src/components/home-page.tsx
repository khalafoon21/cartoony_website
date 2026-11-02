"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { HomepageSectionConfig, Movie } from "@/lib/movies";
import { useWatchlist } from "@/lib/use-watchlist";
import { HeroSlider } from "./hero-slider";
import { Icon, type IconName } from "./icon";
import { MovieRow } from "./movie-row";

type QuickFilterKey = "all" | "movie" | "series" | "latest" | "saved";

const SEGMENTED_TABS: Array<{
  key: Exclude<QuickFilterKey, "all">;
  label: string;
  icon: IconName;
}> = [
  { key: "movie", label: "الأفلام", icon: "clapper" },
  { key: "series", label: "المسلسلات", icon: "monitor" },
  { key: "latest", label: "الأخيرة", icon: "clock" },
  { key: "saved", label: "المفضلة", icon: "heart" },
];

function matchesQuickFilter(movie: Movie, filter: QuickFilterKey, savedIds: string[]): boolean {
  switch (filter) {
    case "all":
      return true;
    case "movie":
      return movie.format === "movie";
    case "series":
      return movie.format === "series";
    case "latest":
      return Boolean(movie.recentlyAdded);
    case "saved":
      return savedIds.includes(movie.id);
  }
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
  const [activeFilter, setActiveFilter] = useState<QuickFilterKey>("movie");
  const { savedIds, toggleSave, clearWatchlist } = useWatchlist();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [glider, setGlider] = useState<{
    left: number;
    width: number;
    visible: boolean;
    ready: boolean;
  }>({ left: 0, width: 0, visible: false, ready: false });

  const safeIndex =
    heroSlides.length > 0
      ? ((selected % heroSlides.length) + heroSlides.length) % heroSlides.length
      : 0;
  const currentMovie = heroSlides[safeIndex] ?? null;

  // Build deduplicated pool of all known movies/series for resolving saved & latest items
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

  // Latest items: prioritize flagged recentlyAdded items, then newest catalogPool entries
  const latestMoviesPool = useMemo(() => {
    const flagged = catalogPool.filter((m) => m.recentlyAdded);
    const rest = catalogPool
      .filter((m) => !flagged.some((f) => f.id === m.id))
      .sort((a, b) => (b.year || 0) - (a.year || 0));
    return [...flagged, ...rest];
  }, [catalogPool]);

  const filteredSections = useMemo((): HomepageSectionConfig[] => {
    if (activeFilter === "all") {
      return sections;
    }

    if (activeFilter === "latest") {
      const latestAll = latestMoviesPool.slice(0, 16);
      const latestFilms = latestMoviesPool.filter((m) => m.format === "movie").slice(0, 12);
      const latestSeries = latestMoviesPool.filter((m) => m.format === "series").slice(0, 12);

      const rows: HomepageSectionConfig[] = [];
      if (latestAll.length > 0) {
        rows.push({
          id: "recently-added",
          eyebrow: "جديد مكتبة كارتوني",
          title: "أُضيف حديثاً",
          subtitle: "أحدث الأفلام والمسلسلات المنشورة في كارتوني",
          items: latestAll,
        });
      }
      if (latestFilms.length > 0 && latestSeries.length > 0) {
        rows.push({
          id: "cartoon-movies",
          eyebrow: "سهرات سينمائية جديدة",
          title: "أحدث الأفلام",
          subtitle: "أحدث أفلام الرسوم المتحركة المضافة للمكتبة",
          items: latestFilms,
        });
        rows.push({
          id: "cartoon-series",
          eyebrow: "حلقات ومواسم جديدة",
          title: "أحدث المسلسلات",
          subtitle: "أحدث مسلسلات الكرتون والأنمي المضافة للمكتبة",
          items: latestSeries,
        });
      }
      return rows;
    }

    const bySection = sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          matchesQuickFilter(item, activeFilter, savedIds)
        ),
      }))
      .filter((section) => section.items.length > 0);

    return bySection;
  }, [sections, activeFilter, savedIds, latestMoviesPool]);

  const filteredFallbackItems = useMemo(() => {
    if (activeFilter === "all" || activeFilter === "latest") return [];
    return catalogPool.filter((item) => matchesQuickFilter(item, activeFilter, savedIds));
  }, [catalogPool, activeFilter, savedIds]);

  // Measure active tab position & width for the sliding pill glider
  const updateGlider = useCallback(() => {
    if (activeFilter === "all") {
      setGlider((prev) => ({ ...prev, visible: false, ready: true }));
      return;
    }
    const btn = tabRefs.current[activeFilter];
    if (!btn) {
      setGlider((prev) => ({ ...prev, visible: false, ready: true }));
      return;
    }
    setGlider({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
      visible: true,
      ready: true,
    });
  }, [activeFilter]);

  useLayoutEffect(() => {
    updateGlider();
  }, [updateGlider, savedMovies.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => updateGlider());
    ro.observe(track);
    window.addEventListener("resize", updateGlider);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateGlider);
    };
  }, [updateGlider]);

  // Sync with #saved hash navigation from header/sidebar
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#saved") {
        setActiveFilter("saved");
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

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

        {/* Modern Segmented Capsule Filter Bar (Movies · Series · Latest · Fav) */}
        {catalogPool.length > 0 && (
          <section
            className="homepage-quick-filter-section content-section"
            aria-label="تصفية سريعة للعروض"
          >
            <div className="segmented-capsule-wrap">
              <div
                ref={trackRef}
                className={`segmented-capsule-bar ${glider.ready ? "is-glider-ready" : ""}`}
                role="tablist"
                aria-label="تصفح حسب القسم"
              >
                <span
                  className={`segmented-capsule-glider ${glider.visible ? "is-visible" : ""}`}
                  style={
                    {
                      width: `${glider.width}px`,
                      transform: `translate3d(${glider.left}px, 0, 0)`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />

                {SEGMENTED_TABS.map((tab) => {
                  const isActive = activeFilter === tab.key;
                  const iconName: IconName =
                    tab.key === "saved" && savedMovies.length > 0 ? "heartFilled" : tab.icon;

                  return (
                    <button
                      key={tab.key}
                      ref={(el) => {
                        tabRefs.current[tab.key] = el;
                      }}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`segmented-capsule-tab ${isActive ? "is-active" : ""}`}
                      onClick={() =>
                        setActiveFilter((prev) => (prev === tab.key ? "all" : tab.key))
                      }
                    >
                      <span className="segmented-tab-icon" aria-hidden="true">
                        <Icon name={iconName} size={18} />
                      </span>
                      <span className="segmented-tab-label" data-label={tab.label}>
                        <span>{tab.label}</span>
                      </span>
                      {tab.key === "saved" && savedMovies.length > 0 && (
                        <span className="segmented-tab-badge">{savedMovies.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>
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

        <div id="stories" key={activeFilter} className="homepage-rows-stack is-tab-transition">
          {/* Persistent Watchlist Section (#saved) */}
          <div id="saved">
            {activeFilter === "saved" ? (
              savedMovies.length > 0 ? (
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
              ) : (
                <section className="movie-row-section content-section">
                  <div className="watchlist-empty-card">
                    <div className="watchlist-empty-icon">
                      <Icon name="heart" size={24} />
                    </div>
                    <div className="watchlist-empty-text">
                      <h3>قائمتك المفضلة فارغة حالياً</h3>
                      <p>
                        اضغط على أيقونة القلب ♥ على أي فيلم أو مسلسل لحفظه هنا والوصول إليه سريعاً في أي وقت.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setActiveFilter("movie")}
                    >
                      <span>استكشف الأفلام والعروض</span>
                    </button>
                  </div>
                </section>
              )
            ) : activeFilter === "all" && savedMovies.length > 0 ? (
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
                eyebrow={activeFilter === "series" ? "حلقات متسلسلة" : "سهرات سينمائية"}
                title={activeFilter === "series" ? "مسلسلات كرتون" : "أفلام كرتون"}
                movies={filteredFallbackItems}
                savedIds={savedIds}
                onToggleSave={toggleSave}
                featuredId={currentMovie?.id}
                viewAllHref={activeFilter === "series" ? "/series" : "/movies"}
                viewAllLabel={activeFilter === "series" ? "كل المسلسلات" : "كل الأفلام"}
              />
            ) : (
              <section className="movie-row-section content-section">
                <div className="public-state-box" role="status">
                  <p>لا توجد عروض مطابقة لهذا القسم حالياً.</p>
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
