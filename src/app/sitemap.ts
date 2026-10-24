import type { MetadataRoute } from "next";
import { allMovies, categories } from "@/lib/movies";
import { getPublicPublishedMovies } from "@/lib/movies-public";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await getPublicPublishedMovies();
  if (!result.ok) throw new Error("Sitemap temporarily unavailable");
  const paths = new Set([
    "/", "/movies",
    ...categories.map((category) => `/category/${category.slug}`),
    ...[...result.movies, ...allMovies.filter((movie) => movie.format === "series")]
      .map((movie) => `/movies/${encodeURIComponent(movie.slug)}`),
  ]);
  return [...paths].map((path) => ({ url: `${SITE_URL}${path}` }));
}
