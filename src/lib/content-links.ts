import type { Movie } from "./movies";

export function getContentHref(item: Pick<Movie, "format" | "slug">): string {
  const prefix = item.format === "series" ? "/series" : "/movies";
  return `${prefix}/${encodeURIComponent(item.slug)}`;
}
