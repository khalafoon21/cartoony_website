import "server-only";
import type { MetadataRoute } from "next";
import type { Movie } from "./movies";
import { executePublicRead } from "./supabase-server";
import { absoluteUrl } from "./site";

export function sitemapDate(value?: string | null): Date | undefined {
  if (!value || !Number.isFinite(Date.parse(value))) return undefined;
  return new Date(value);
}

export async function episodeSitemapEntries(catalog: Movie[]): Promise<MetadataRoute.Sitemap> {
  const seriesIds = new Set(catalog.filter((item) => item.format === "series").map((item) => item.id));
  if (seriesIds.size === 0) return [];

  const result = await executePublicRead<Array<{
    id: string;
    slug: string;
    seasons?: Array<{
      status: string;
      episodes?: Array<{
        slug: string;
        status: string;
        updated_at?: string;
        metadata?: { video_url?: string };
      }>;
    }>;
  }>>(
    "series",
    "?select=id,slug,seasons(status,episodes(slug,status,updated_at,metadata))&status=eq.published"
  );
  if (!result.ok) throw new Error("Episode sitemap temporarily unavailable");

  const entries: MetadataRoute.Sitemap = [];
  for (const series of result.data) {
    if (!seriesIds.has(series.id)) continue;
    for (const season of series.seasons ?? []) {
      if (season.status !== "published") continue;
      for (const episode of season.episodes ?? []) {
        if (episode.status !== "published" || typeof episode.metadata?.video_url !== "string" || !episode.metadata.video_url.trim()) continue;
        entries.push({
          url: absoluteUrl(`/watch/series/${encodeURIComponent(series.slug)}/${encodeURIComponent(episode.slug)}`),
          lastModified: sitemapDate(episode.updated_at),
        });
      }
    }
  }
  return entries;
}
