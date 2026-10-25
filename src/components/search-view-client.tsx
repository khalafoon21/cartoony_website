"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { MovieCard } from "@/components/movie-card";
import { getContentHref } from "@/lib/content-links";
import type { Movie } from "@/lib/movies";
import type { SearchSuggestion } from "@/lib/search-public";

export type SearchViewClientProps = {
  initialItems: Movie[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  availableYears: number[];
  availableAgeRatings: string[];
  initialQuery?: string;
  initialFormat?: string;
  initialCategory?: string;
  initialYear?: string;
  initialAgeRating?: string;
  initialMinRating?: number;
  initialSortBy?: string;
  error?: string;
};

const CATEGORIES = [
  { slug: "all", label: "كل التصنيفات" },
  { slug: "action", label: "حركة وإثارة" },
  { slug: "adventure", label: "مغامرات" },
  { slug: "comedy", label: "كوميديا" },
  { slug: "family", label: "عائلي" },
  { slug: "fantasy", label: "خيال وأساطير" },
  { slug: "anime", label: "أنمي" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "الأكثر صلة" },
  { value: "newest", label: "الأحدث إصداراً" },
  { value: "oldest", label: "الأقدم إصداراً" },
  { value: "highest_rated", label: "الأعلى تقييماً" },
  { value: "title_asc", label: "أبجدياً (أ - ي)" },
];

export function SearchViewClient({
  initialItems,
  totalCount,
  totalPages,
  currentPage,
  availableYears,
  availableAgeRatings,
  initialQuery = "",
  initialFormat = "all",
  initialCategory = "all",
  initialYear = "all",
  initialAgeRating = "all",
  initialMinRating = 0,
  initialSortBy = "relevance",
  error,
}: SearchViewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [inputValue, setInputValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when URL search params change
  useEffect(() => {
    setInputValue(searchParams.get("q") || "");
  }, [searchParams]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch live autocomplete suggestions as user types
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(Boolean(data.suggestions && data.suggestions.length > 0));
        }
      } catch {
        // Ignore suggestion network errors
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 240);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue]);

  const updateFilters = (changes: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Merge changes
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === "" || value === "all" || value === 0) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    // Reset to page 1 unless page change specifically requested
    if (!("page" in changes)) {
      params.delete("page");
    }

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    updateFilters({ q: inputValue.trim() });
  };

  const handleClearSearch = () => {
    setInputValue("");
    setShowSuggestions(false);
    updateFilters({ q: "" });
  };

  const hasActiveFilters = Boolean(
    initialQuery ||
      initialFormat !== "all" ||
      initialCategory !== "all" ||
      initialYear !== "all" ||
      initialAgeRating !== "all" ||
      initialMinRating > 0 ||
      (initialSortBy !== "relevance" && initialSortBy !== "newest")
  );

  const handleResetAll = () => {
    setInputValue("");
    setShowSuggestions(false);
    startTransition(() => {
      router.push("/search");
    });
  };

  return (
    <div className="search-page-container">
      {/* Header and Hero Bar */}
      <header className="search-header-hero">
        <div className="search-heading-meta">
          <span className="eyebrow">مكتبة كارتوني الشاملة</span>
          <h1>
            البحث والاستكشاف<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          <p>ابحث عن أفلامك ومسلسلاتك المفضلة بالعربية أو بالإنجليزية مع تصفيات دقيقة.</p>
        </div>

        {/* Search Input Box with Autocomplete Dropdown */}
        <div ref={searchBoxRef} className="search-input-wrapper">
          <form onSubmit={handleSearchSubmit} className="search-bar-form" role="search">
            <span className="search-icon-box" aria-hidden="true">
              <Icon name="search" size={20} />
            </span>

            <input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="ابحث بالعنوان، السلسلة، أو قصة العمل... (مثال: الأسد الملك، Gravity Falls)"
              className="search-main-input"
              autoComplete="off"
              dir="auto"
            />

            {inputValue && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="search-clear-btn"
                aria-label="مسح البحث"
              >
                <Icon name="close" size={16} />
              </button>
            )}

            <button type="submit" className="search-submit-btn">
              <span>بحث</span>
            </button>
          </form>

          {/* Autocomplete Suggestions Menu */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions-dropdown" role="listbox">
              <div className="suggestions-header">
                <span>اقتراحات سريعة</span>
                {isSearchingSuggestions && <small>جاري البحث...</small>}
              </div>
              <ul className="suggestions-list">
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={getContentHref(item)}
                      className="suggestion-item-link"
                      onClick={() => setShowSuggestions(false)}
                    >
                      <div className="suggestion-thumb">
                        {item.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.posterUrl} alt={item.title} />
                        ) : (
                          <Icon name="sparkles" size={18} />
                        )}
                      </div>
                      <div className="suggestion-info">
                        <span className="suggestion-title">{item.title}</span>
                        <div className="suggestion-sub">
                          <span className="suggestion-badge">
                            {item.format === "series" ? "مسلسل" : "فيلم"}
                          </span>
                          <span className="meta-dot" />
                          <span>{item.year}</span>
                          <span className="meta-dot" />
                          <span>{item.categoryLabel}</span>
                          {item.englishTitle && (
                            <>
                              <span className="meta-dot" />
                              <span dir="ltr" className="suggestion-en">
                                {item.englishTitle}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="suggestion-rating">
                        <Icon name="star" size={13} />
                        <b>{item.rating}</b>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Format Switcher Tabs: All / Movies / Series */}
      <div className="search-format-tabs" role="tablist" aria-label="نوع المحتوى">
        <button
          type="button"
          role="tab"
          aria-selected={initialFormat === "all"}
          className={`search-format-pill ${initialFormat === "all" ? "is-active" : ""}`}
          onClick={() => updateFilters({ format: "all" })}
        >
          <Icon name="sparkles" size={16} />
          <span>الكل ({totalCount})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={initialFormat === "movie"}
          className={`search-format-pill ${initialFormat === "movie" ? "is-active" : ""}`}
          onClick={() => updateFilters({ format: "movie" })}
        >
          <Icon name="film" size={16} />
          <span>أفلام كرتون</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={initialFormat === "series"}
          className={`search-format-pill ${initialFormat === "series" ? "is-active" : ""}`}
          onClick={() => updateFilters({ format: "series" })}
        >
          <Icon name="grid" size={16} />
          <span>مسلسلات كرتون</span>
        </button>
      </div>

      {/* Secondary Filter Bar & Sort Controls */}
      <div className="search-filters-bar">
        <div className="search-filter-select-group">
          {/* Category Filter */}
          <div className="search-select-wrap">
            <label htmlFor="filter-category" className="visually-hidden">
              التصنيف
            </label>
            <select
              id="filter-category"
              value={initialCategory}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="search-select"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Release Year Filter */}
          <div className="search-select-wrap">
            <label htmlFor="filter-year" className="visually-hidden">
              سنة الإصدار
            </label>
            <select
              id="filter-year"
              value={initialYear}
              onChange={(e) => updateFilters({ year: e.target.value })}
              className="search-select"
            >
              <option value="all">كل السنوات</option>
              <option value="2020s">عقد 2020s</option>
              <option value="2010s">عقد 2010s</option>
              <option value="2000s">عقد 2000s</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  عام {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Age Rating Filter */}
          {availableAgeRatings.length > 0 && (
            <div className="search-select-wrap">
              <label htmlFor="filter-age" className="visually-hidden">
                الفئة العمرية
              </label>
              <select
                id="filter-age"
                value={initialAgeRating}
                onChange={(e) => updateFilters({ ageRating: e.target.value })}
                className="search-select"
              >
                <option value="all">كل الأعمار</option>
                {availableAgeRatings.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Minimum Rating Filter */}
          <div className="search-select-wrap">
            <label htmlFor="filter-min-rating" className="visually-hidden">
              التقييم
            </label>
            <select
              id="filter-min-rating"
              value={String(initialMinRating)}
              onChange={(e) => updateFilters({ minRating: Number(e.target.value) })}
              className="search-select"
            >
              <option value="0">كل التقييمات</option>
              <option value="7">⭐ 7.0 فما فوق</option>
              <option value="8">⭐ 8.0 فما فوق (ممتاز)</option>
              <option value="9">⭐ 9.0 فما فوق (تحفة)</option>
            </select>
          </div>
        </div>

        {/* Sorting Dropdown */}
        <div className="search-sort-group">
          <label htmlFor="filter-sort" className="search-sort-label">
            الترتيب:
          </label>
          <select
            id="filter-sort"
            value={initialSortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value })}
            className="search-select is-sort"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Row with Reset Button */}
      {hasActiveFilters && (
        <div className="search-active-tags-row">
          <span className="search-tags-label">التصفيات المطبقة:</span>

          {initialQuery && (
            <span className="search-tag-pill">
              <span>البحث: &quot;{initialQuery}&quot;</span>
              <button
                type="button"
                onClick={() => updateFilters({ q: "" })}
                aria-label="إزالة نص البحث"
              >
                ×
              </button>
            </span>
          )}

          {initialFormat !== "all" && (
            <span className="search-tag-pill">
              <span>{initialFormat === "movie" ? "أفلام فقط" : "مسلسلات فقط"}</span>
              <button
                type="button"
                onClick={() => updateFilters({ format: "all" })}
                aria-label="إزالة فلتر النوع"
              >
                ×
              </button>
            </span>
          )}

          {initialCategory !== "all" && (
            <span className="search-tag-pill">
              <span>
                {CATEGORIES.find((c) => c.slug === initialCategory)?.label || initialCategory}
              </span>
              <button
                type="button"
                onClick={() => updateFilters({ category: "all" })}
                aria-label="إزالة فلتر التصنيف"
              >
                ×
              </button>
            </span>
          )}

          {initialYear !== "all" && (
            <span className="search-tag-pill">
              <span>سنة {initialYear}</span>
              <button
                type="button"
                onClick={() => updateFilters({ year: "all" })}
                aria-label="إزالة فلتر السنة"
              >
                ×
              </button>
            </span>
          )}

          {initialAgeRating !== "all" && (
            <span className="search-tag-pill">
              <span>عمر {initialAgeRating}</span>
              <button
                type="button"
                onClick={() => updateFilters({ ageRating: "all" })}
                aria-label="إزالة فلتر العمر"
              >
                ×
              </button>
            </span>
          )}

          {initialMinRating > 0 && (
            <span className="search-tag-pill">
              <span>تقييم {initialMinRating}+</span>
              <button
                type="button"
                onClick={() => updateFilters({ minRating: 0 })}
                aria-label="إزالة فلتر التقييم"
              >
                ×
              </button>
            </span>
          )}

          <button
            type="button"
            className="search-reset-all-btn"
            onClick={handleResetAll}
          >
            مسح كل التصفيات
          </button>
        </div>
      )}

      {/* Loading Overlay State during transition */}
      <div className={`search-results-area ${isPending ? "is-loading" : ""}`}>
        {error ? (
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="primary-button"
              style={{ marginTop: "14px" }}
              onClick={handleResetAll}
            >
              إعادة تعيين البحث
            </button>
          </div>
        ) : initialItems.length === 0 ? (
          /* Empty State */
          <div className="search-empty-state" role="status">
            <div className="search-empty-icon">
              <Icon name="search" size={44} />
            </div>
            <h3>لم نجد أي حكايات مطابقة لبحثك</h3>
            <p>
              {initialQuery
                ? `لم يتم العثور على نتائج تطابق "${initialQuery}". جرب كتابة كلمة أخرى أو إزالة بعض خيارات التصفية.`
                : "لا توجد نتائج مطابقة لهذه الخيارات المحددة. جرب تغيير التصنيف أو السنة."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="primary-button"
                style={{ marginTop: "12px" }}
                onClick={handleResetAll}
              >
                إظهار كل الأعمال المتوفرة
              </button>
            )}
          </div>
        ) : (
          /* Results Grid */
          <>
            <div className="search-results-summary">
              <span>
                تم العثور على <strong>{totalCount}</strong> {totalCount === 1 ? "عمل كرتوني" : "أعمال كرتونية"}
              </span>
            </div>

            <div className="search-cards-grid">
              {initialItems.map((movie) => (
                <MovieCard key={`${movie.format}-${movie.id}`} movie={movie} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav className="search-pagination-nav" aria-label="صفحات نتائج البحث">
                <button
                  type="button"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => updateFilters({ page: currentPage - 1 })}
                  className="search-page-btn"
                  aria-label="الصفحة السابقة"
                >
                  <Icon name="arrow" size={16} />
                  <span>السابق</span>
                </button>

                <div className="search-page-numbers">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => {
                    const isCurr = pg === currentPage;
                    return (
                      <button
                        key={pg}
                        type="button"
                        aria-current={isCurr ? "page" : undefined}
                        disabled={isPending}
                        className={`search-page-num ${isCurr ? "is-active" : ""}`}
                        onClick={() => updateFilters({ page: pg })}
                      >
                        {pg}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => updateFilters({ page: currentPage + 1 })}
                  className="search-page-btn is-next"
                  aria-label="الصفحة التالية"
                >
                  <span>التالي</span>
                  <Icon name="arrow" size={16} />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
