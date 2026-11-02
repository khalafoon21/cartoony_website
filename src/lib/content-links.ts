import type { Movie } from "./movies";

export function getContentHref(item: Pick<Movie, "format" | "slug">): string {
  const prefix = item.format === "series" ? "/series" : "/movies";
  return `${prefix}/${encodeURIComponent(item.slug)}`;
}

export function matchesCategory(item: Movie, slug: string): boolean {
  return slug === "movies"
    ? item.format === "movie"
    : item.category === slug || Boolean(item.categories?.some((category) => category === slug));
}

export function getCategoryHref(slug: string): string {
  return slug === "movies" ? "/movies" : `/category/${encodeURIComponent(slug)}`;
}
