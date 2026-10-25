import type { MetadataRoute } from "next";
import { categories } from "@/lib/movies";
import { getPublicPublishedCatalog } from "@/lib/movies-public";
import { getContentHref } from "@/lib/content-links";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await getPublicPublishedCatalog();
  if (!result.ok) throw new Error("Sitemap temporarily unavailable");
  const paths = new Set([
    "/", "/movies", "/series", "/search",
    ...categories.map((category) => `/category/${category.slug}`),
    ...result.movies.map(getContentHref),
  ]);
  return [...paths].map((path) => ({ url: `${SITE_URL}${path}` }));
}
