import "server-only";

import type { CategorySlug, ContentFormat, Movie } from "./movies";
import { getPublicPublishedCatalog } from "./movies-public";

export type SearchFilters = {
  query?: string;
  format?: "all" | ContentFormat;
  category?: string;
  year?: string;
  ageRating?: string;
  minRating?: number;
  sortBy?: "relevance" | "newest" | "oldest" | "highest_rated" | "title_asc";
  page?: number;
  pageSize?: number;
};

export type SearchSuggestion = {
  id: string;
  slug: string;
  title: string;
  englishTitle: string;
  format: ContentFormat;
  year: number;
  rating: string;
  posterUrl: string | null;
  categoryLabel: string;
};

export type SearchResult = {
  ok: boolean;
  error?: string;
  items: Movie[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  availableYears: number[];
  availableAgeRatings: string[];
};

export function normalizeArabicText(text: string): string {
  if (!text) return "";
  return text
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // Normalize Alefs (أ, إ, آ, ٱ -> ا)
    .replace(/[أإآٱ]/g, "ا")
    // Normalize Teh Marbuta (ة -> ه)
    .replace(/ة/g, "ه")
    // Normalize Ya / Alef Maksura (ى -> ي)
    .replace(/ى/g, "ي")
    // Normalize Arabic tatweel / kashida (ـ)
    .replace(/ـ/g, "")
    .toLowerCase()
    .trim();
}

export async function searchPublicContent(filters: SearchFilters): Promise<SearchResult> {
  const catalogRes = await getPublicPublishedCatalog();
  if (!catalogRes.ok) {
    return {
      ok: false,
      error: catalogRes.error,
      items: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      availableYears: [],
      availableAgeRatings: [],
    };
  }

  const allMovies = catalogRes.movies;

  // Extract available filter choices
  const availableYears = Array.from(
    new Set(allMovies.map((m) => m.year).filter((y): y is number => typeof y === "number" && y > 1900))
  ).sort((a, b) => b - a);

  const availableAgeRatings = Array.from(
    new Set(allMovies.map((m) => m.ageRating).filter((a): a is string => Boolean(a)))
  ).sort();

  const cleanQuery = (filters.query ?? "").trim();
  const normalizedQuery = normalizeArabicText(cleanQuery);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  let scoredItems: Array<{ item: Movie; score: number }> = allMovies.map((item) => {
    let score = 0;
    if (queryTokens.length > 0) {
      const normTitle = normalizeArabicText(item.title);
      const normEnglish = normalizeArabicText(item.englishTitle);
      const normFranchise = normalizeArabicText(item.franchise);
      const normDesc = normalizeArabicText(item.description);
      const searchableBlob = `${normTitle} ${normEnglish} ${normFranchise} ${normDesc}`;

      // Every word in the query must match somewhere in the content
      const matchesAllTokens = queryTokens.every((token) => searchableBlob.includes(token));
      if (!matchesAllTokens) {
        return { item, score: -1 };
      }

      // Relevance scoring
      if (normTitle === normalizedQuery) {
        score += 150;
      } else if (normTitle.startsWith(normalizedQuery)) {
        score += 90;
      } else if (normTitle.includes(normalizedQuery)) {
        score += 60;
      }

      if (normEnglish.includes(normalizedQuery)) {
        score += 40;
      }
      if (normFranchise.includes(normalizedQuery)) {
        score += 25;
      }
      if (normDesc.includes(normalizedQuery)) {
        score += 10;
      }
    }
    return { item, score };
  });

  // Filter out non-matching queries
  if (queryTokens.length > 0) {
    scoredItems = scoredItems.filter((entry) => entry.score >= 0);
  }

  // Filter by format (movies vs series)
  if (filters.format && filters.format !== "all") {
    scoredItems = scoredItems.filter((entry) => entry.item.format === filters.format);
  }

  // Filter by category
  if (filters.category && filters.category !== "all") {
    const catSlug = filters.category.toLowerCase();
    scoredItems = scoredItems.filter(
      (entry) =>
        entry.item.category === catSlug ||
        (entry.item.categories && entry.item.categories.includes(catSlug as CategorySlug))
    );
  }

  // Filter by year or decade
  if (filters.year && filters.year !== "all") {
    if (filters.year.endsWith("s")) {
      const decadeStart = parseInt(filters.year, 10);
      if (!isNaN(decadeStart)) {
        scoredItems = scoredItems.filter(
          (entry) => entry.item.year >= decadeStart && entry.item.year < decadeStart + 10
        );
      }
    } else {
      const exactYear = parseInt(filters.year, 10);
      if (!isNaN(exactYear)) {
        scoredItems = scoredItems.filter((entry) => entry.item.year === exactYear);
      }
    }
  }

  // Filter by age rating
  if (filters.ageRating && filters.ageRating !== "all") {
    scoredItems = scoredItems.filter(
      (entry) =>
        entry.item.ageRating &&
        entry.item.ageRating.toLowerCase() === filters.ageRating!.toLowerCase()
    );
  }

  // Filter by minimum rating
  if (filters.minRating && filters.minRating > 0) {
    scoredItems = scoredItems.filter(
      (entry) => Number(entry.item.rating || 0) >= filters.minRating!
    );
  }

  // Sorting
  const sortBy = filters.sortBy || (queryTokens.length > 0 ? "relevance" : "newest");

  scoredItems.sort((a, b) => {
    switch (sortBy) {
      case "relevance":
        if (b.score !== a.score) return b.score - a.score;
        return (b.item.year || 0) - (a.item.year || 0);
      case "newest":
        return (b.item.year || 0) - (a.item.year || 0);
      case "oldest":
        return (a.item.year || 0) - (b.item.year || 0);
      case "highest_rated":
        return Number(b.item.rating || 0) - Number(a.item.rating || 0);
      case "title_asc":
        return a.item.title.localeCompare(b.item.title, "ar");
      default:
        return 0;
    }
  });

  const totalCount = scoredItems.length;
  const pageSize = Math.min(48, Math.max(1, filters.pageSize || 16));
  const currentPage = Math.max(1, filters.page || 1);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = scoredItems
    .slice(startIndex, startIndex + pageSize)
    .map((entry) => entry.item);

  return {
    ok: true,
    items: paginatedItems,
    totalCount,
    totalPages,
    currentPage,
    availableYears,
    availableAgeRatings,
  };
}

export async function getSearchSuggestions(
  query: string,
  limit = 6
): Promise<SearchSuggestion[]> {
  const clean = query.trim();
  if (!clean) return [];

  const searchRes = await searchPublicContent({
    query: clean,
    page: 1,
    pageSize: limit,
    sortBy: "relevance",
  });

  return searchRes.items.slice(0, limit).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    englishTitle: item.englishTitle,
    format: item.format,
    year: item.year,
    rating: item.rating,
    posterUrl: item.posterUrl ?? null,
    categoryLabel: item.categoryLabel,
  }));
}
