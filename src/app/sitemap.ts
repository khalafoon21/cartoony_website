import type { MetadataRoute } from "next";
import { categories } from "@/lib/movies";
import { getPublicPublishedCatalog } from "@/lib/movies-public";
import { getContentHref, matchesCategory } from "@/lib/content-links";
import { absoluteUrl } from "@/lib/site";
import { episodeSitemapEntries, sitemapDate } from "@/lib/sitemap-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.VERCEL_ENV === "preview") return [];
  const result = await getPublicPublishedCatalog();
  if (!result.ok) throw new Error("Sitemap temporarily unavailable");
  const entries: MetadataRoute.Sitemap = [
    ...["/", "/movies", "/series"].map((path) => ({ url: absoluteUrl(path) })),
    ...categories
      .filter((category) => category.slug !== "movies" && result.movies.some((item) => matchesCategory(item, category.slug)))
      .map((category) => ({ url: absoluteUrl(`/category/${category.slug}`) })),
    ...result.movies.map((item) => ({
      url: absoluteUrl(getContentHref(item)),
      lastModified: sitemapDate(item.updatedAt),
    })),
    ...result.movies
      .filter((item) => item.format === "movie" && item.videoUrl?.trim())
      .map((item) => ({
        url: absoluteUrl(`/watch/movies/${encodeURIComponent(item.slug)}`),
        lastModified: sitemapDate(item.updatedAt),
      })),
    ...(await episodeSitemapEntries(result.movies)),
  ];
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}
