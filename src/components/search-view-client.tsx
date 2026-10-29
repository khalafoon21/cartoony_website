"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { MovieCard } from "@/components/movie-card";
import { useWatchlist } from "@/lib/use-watchlist";
import type { Movie } from "@/lib/movies";

export type QuickSearchFilter = "all" | "movie" | "series" | "dubbed" | "subtitled";

export type SearchViewClientProps = {
  allItems: Movie[];
  initialQuery?: string;
  initialFilter?: string;
  error?: string;
};

const RECENT_SEARCHES_KEY = "cartoony:recent_searches";
const MAX_RECENT_SEARCHES = 6;
const PAGE_STEP = 18;

/**
 * Normalizes Arabic & English text for instant fuzzy-friendly matching:
 * - Strips Arabic diacritics / tashkeel & tatweel
 * - Normalizes Alef variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Teh Marbuta (ة -> ه) and Alef Maksura (ى -> ي)
 * - Strips leading Arabic definite article "ال" from each word so "اسد" matches "الأسد"
 */
export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word.length > 3 && word.startsWith("ال") ? word.slice(2) : word))
    .join(" ")
    .trim();
}

function parseInitialFilter(raw?: string): QuickSearchFilter {
  if (
    raw === "movie" ||
    raw === "series" ||
    raw === "dubbed" ||
    raw === "subtitled"
  ) {
    return raw;
  }
  return "all";
}

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function writeRecentSearches(items: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // Ignore storage errors
  }
}

export function SearchViewClient({
  allItems,
  initialQuery = "",
  initialFilter = "all",
  error,
}: SearchViewClientProps) {
  const { savedIds, toggleSave } = useWatchlist();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<QuickSearchFilter>(() =>
    parseInitialFilter(initialFilter)
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  // Global "/" shortcut to focus search and "Escape" to clear
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Save a search term into recent searches
  const saveRecentTerm = useCallback((term: string) => {
    const cleaned = term.trim();
    if (cleaned.length < 2) return;
    setRecentSearches((prev) => {
      const next = [
        cleaned,
        ...prev.filter((item) => item.toLowerCase() !== cleaned.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);
      writeRecentSearches(next);
      return next;
    });
  }, []);

  const removeRecentTerm = (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item !== term);
      writeRecentSearches(next);
      return next;
    });
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    writeRecentSearches([]);
  };

  // Sync URL query & filter using replaceState (without polluting browser history)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      const trimmed = query.trim();
      if (trimmed) params.set("q", trimmed);
      if (activeFilter !== "all") params.set("filter", activeFilter);
      const qs = params.toString();
      const nextUrl = qs ? `/search?${qs}` : "/search";
      window.history.replaceState(null, "", nextUrl);
    }, 180);

    return () => clearTimeout(timer);
  }, [query, activeFilter]);

  // Save typed query to recent searches after user pauses typing
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timer = setTimeout(() => {
      saveRecentTerm(trimmed);
    }, 1100);
    return () => clearTimeout(timer);
  }, [query, saveRecentTerm]);

  // Reset pagination count when query or filter changes
  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [query, activeFilter]);

  // Pre-index normalized fields once for instant 0ms client-side filtering
  const indexedCatalog = useMemo(() => {
    return allItems.map((item) => {
      const normTitle = normalizeSearchText(item.title);
      const normEnglish = normalizeSearchText(item.englishTitle);
      const normFranchise = normalizeSearchText(item.franchise);
      const normCategory = normalizeSearchText(
        [item.categoryLabel, ...(item.categoryLabels || [])].join(" ")
      );
      const normDesc = normalizeSearchText(item.description);
      const isDubbed = (item.audioBadge || "").includes("مدبلج");
      return {
        item,
        normTitle,
        normEnglish,
        normFranchise,
        normCategory,
        normDesc,
        searchableBlob: `${normTitle} ${normEnglish} ${normFranchise} ${normCategory} ${normDesc} ${item.year || ""}`,
        isDubbed,
      };
    });
  }, [allItems]);

  // Compute filter counts (before applying activeFilter so each pill shows accurate count)
  const queryMatchedEntries = useMemo(() => {
    const clean = query.trim();
    const normQuery = normalizeSearchText(clean);
    const tokens = normQuery.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      return indexedCatalog.map((entry) => ({ entry, score: 0 }));
    }

    const matches: Array<{ entry: (typeof indexedCatalog)[number]; score: number }> = [];

    for (const entry of indexedCatalog) {
      const matchesAll = tokens.every((tk) => entry.searchableBlob.includes(tk));
      if (!matchesAll) continue;

      let score = 0;
      if (entry.normTitle === normQuery) score += 160;
      else if (entry.normTitle.startsWith(normQuery)) score += 100;
      else if (entry.normTitle.includes(normQuery)) score += 70;

      if (entry.normEnglish.includes(normQuery)) score += 50;
      if (entry.normFranchise.includes(normQuery)) score += 35;
      if (entry.normCategory.includes(normQuery)) score += 25;
      if (entry.normDesc.includes(normQuery)) score += 10;

      matches.push({ entry, score });
    }

    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.entry.item.year || 0) - (a.entry.item.year || 0);
    });

    return matches;
  }, [indexedCatalog, query]);

  const filterCounts = useMemo(() => {
    let movie = 0;
    let series = 0;
    let dubbed = 0;
    let subtitled = 0;
    for (const { entry } of queryMatchedEntries) {
      if (entry.item.format === "movie") movie++;
      else if (entry.item.format === "series") series++;
      if (entry.isDubbed) dubbed++;
      else subtitled++;
    }
    return {
      all: queryMatchedEntries.length,
      movie,
      series,
      dubbed,
      subtitled,
    };
  }, [queryMatchedEntries]);

  const filteredMovies = useMemo(() => {
    return queryMatchedEntries
      .filter(({ entry }) => {
        if (activeFilter === "movie") return entry.item.format === "movie";
        if (activeFilter === "series") return entry.item.format === "series";
        if (activeFilter === "dubbed") return entry.isDubbed;
        if (activeFilter === "subtitled") return !entry.isDubbed;
        return true;
      })
      .map(({ entry }) => entry.item);
  }, [queryMatchedEntries, activeFilter]);

  const visibleMovies = useMemo(
    () => filteredMovies.slice(0, visibleCount),
    [filteredMovies, visibleCount]
  );

  const hasMore = visibleCount < filteredMovies.length;
  const isSearchActive = query.trim().length > 0 || activeFilter !== "all";

  const handleReset = () => {
    setQuery("");
    setActiveFilter("all");
    inputRef.current?.focus();
  };

  return (
    <div className="search-page-container is-modern-search">
      {/* Sticky Spatial Search Header */}
      <header className="search-modern-header">
        <div className="search-modern-title-row">
          <div>
            <span className="eyebrow">بحث فوري وذكي</span>
            <h1>
              ابحث في كارتوني<span style={{ color: "var(--orange)" }}>.</span>
            </h1>
          </div>
          {isSearchActive && (
            <button
              type="button"
              className="quick-filter-reset"
              onClick={handleReset}
            >
              <Icon name="close" size={13} />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>

        {/* Instant Glass Search Input */}
        <div className="search-modern-box" role="search">
          <span className="search-modern-icon" aria-hidden="true">
            <Icon name="search" size={20} />
          </span>

          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              } else if (e.key === "Enter" && query.trim()) {
                e.preventDefault();
                saveRecentTerm(query.trim());
                inputRef.current?.blur();
              }
            }}
            placeholder="ابحث عن فيلم، مسلسل، أو شخصية..."
            className="search-modern-input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            dir="rtl"
            aria-label="ابحث في مكتبة كارتوني"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="search-modern-clear"
              aria-label="مسح النص"
            >
              <Icon name="close" size={15} />
              <span>مسح</span>
            </button>
          ) : (
            <kbd className="search-shortcut-kbd" aria-hidden="true">
              /
            </kbd>
          )}
        </div>

        {/* Single Clean Quick Filter Pills Row (Same DNA as Homepage) */}
        <div className="quick-filter-bar is-search-filter-bar">
          <div className="quick-filter-pills" role="tablist" aria-label="تصفية سريعة">
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "all"}
              className={`quick-filter-pill ${activeFilter === "all" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              <Icon name="sparkles" size={14} />
              <span>الكل</span>
              <span className="quick-filter-count">{filterCounts.all}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "movie"}
              className={`quick-filter-pill ${activeFilter === "movie" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("movie")}
            >
              <Icon name="film" size={14} />
              <span>أفلام</span>
              <span className="quick-filter-count">{filterCounts.movie}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "series"}
              className={`quick-filter-pill ${activeFilter === "series" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("series")}
            >
              <Icon name="tv" size={14} />
              <span>مسلسلات</span>
              <span className="quick-filter-count">{filterCounts.series}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "dubbed"}
              className={`quick-filter-pill ${activeFilter === "dubbed" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("dubbed")}
            >
              <span>مدبلج عربي</span>
              <span className="quick-filter-count">{filterCounts.dubbed}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "subtitled"}
              className={`quick-filter-pill ${activeFilter === "subtitled" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("subtitled")}
            >
              <span>مترجم</span>
              <span className="quick-filter-count">{filterCounts.subtitled}</span>
            </button>
          </div>
        </div>

        {/* Recent Searches Chips (Shown when query is empty) */}
        {!query.trim() && recentSearches.length > 0 && (
          <div className="search-recent-bar" aria-label="عمليات البحث الأخيرة">
            <div className="search-recent-header">
              <span className="search-recent-label">عمليات البحث الأخيرة:</span>
              <button
                type="button"
                className="search-recent-clear-all"
                onClick={clearAllRecent}
              >
                مسح السجل
              </button>
            </div>
            <div className="search-recent-chips">
              {recentSearches.map((term) => (
                <div key={term} className="search-recent-chip">
                  <button
                    type="button"
                    className="search-recent-chip-btn"
                    onClick={() => setQuery(term)}
                  >
                    <Icon name="search" size={12} />
                    <span>{term}</span>
                  </button>
                  <button
                    type="button"
                    className="search-recent-chip-remove"
                    onClick={() => removeRecentTerm(term)}
                    aria-label={`حذف "${term}" من السجل`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Results Section */}
      <div className="search-results-area">
        {error ? (
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="search-empty-state" role="status">
            <div className="search-empty-icon">
              <Icon name="search" size={38} />
            </div>
            <h3>لم نجد نتائج مطابقة</h3>
            <p>
              {query.trim()
                ? `لا توجد نتائج تطابق "${query.trim()}". جرب كتابة اسم آخر أو تغيير الفلتر المحدد.`
                : "لا توجد أعمال ضمن هذا الفلتر حالياً."}
            </p>
            <button
              type="button"
              className="primary-button"
              style={{ marginTop: "8px" }}
              onClick={handleReset}
            >
              <span>عرض كل الأعمال ({allItems.length})</span>
            </button>
          </div>
        ) : (
          <>
            <div className="search-results-summary">
              {query.trim() ? (
                <span>
                  نتائج البحث عن <strong>&quot;{query.trim()}&quot;</strong> ({filteredMovies.length})
                </span>
              ) : (
                <span>
                  {activeFilter === "all"
                    ? `أحدث الإضافات في المكتبة (${filteredMovies.length})`
                    : `عدد الأعمال المعروضة (${filteredMovies.length})`}
                </span>
              )}
            </div>

            <div className="search-cards-grid is-modern-grid">
              {visibleMovies.map((movie) => (
                <MovieCard
                  key={`${movie.format}-${movie.id}`}
                  movie={movie}
                  isSaved={savedIds.includes(movie.id)}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>

            {hasMore && (
              <div className="search-load-more-wrap">
                <button
                  type="button"
                  className="search-load-more-btn"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_STEP)}
                >
                  <span>
                    عرض المزيد ({filteredMovies.length - visibleCount} متبقي)
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
