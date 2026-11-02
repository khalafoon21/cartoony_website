import type { Movie } from "./movies";
import type { PublicEpisode, PublicSeason } from "./movies-public";
import { getContentHref } from "./content-links";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: "Cartoony",
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/`,
    inLanguage: "ar",
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function contentJsonLd(item: Movie) {
  const path = getContentHref(item);
  const image = item.posterUrl || item.backdropUrl;
  return {
    "@context": "https://schema.org",
    "@type": item.format === "series" ? "TVSeries" : "Movie",
    "@id": `${absoluteUrl(path)}#work`,
    name: item.title,
    alternateName: item.englishTitle && item.englishTitle !== item.title ? item.englishTitle : undefined,
    description: item.description || undefined,
    image: image ? absoluteUrl(image) : undefined,
    genre: item.categoryLabels?.length ? item.categoryLabels : undefined,
    contentRating: item.ageRating || undefined,
    inLanguage: "ar",
    url: absoluteUrl(path),
  };
}

export function episodeJsonLd(series: Movie, season: PublicSeason, episode: PublicEpisode) {
  const path = `/watch/series/${series.slug}/${episode.slug}`;
  const image = episode.stillUrl || series.backdropUrl || series.posterUrl;
  return {
    "@context": "https://schema.org",
    "@type": "TVEpisode",
    "@id": `${absoluteUrl(path)}#episode`,
    name: episode.title,
    alternateName: episode.originalTitle || undefined,
    description: episode.description || series.description || undefined,
    episodeNumber: episode.episodeNumber,
    duration: episode.durationMinutes > 0 ? `PT${episode.durationMinutes}M` : undefined,
    image: image ? absoluteUrl(image) : undefined,
    inLanguage: "ar",
    partOfSeason: { "@type": "TVSeason", name: season.title, seasonNumber: season.seasonNumber },
    partOfSeries: { "@type": "TVSeries", "@id": `${absoluteUrl(getContentHref(series))}#work`, name: series.title },
    url: absoluteUrl(path),
  };
}

export function videoJsonLd({
  title, description, path, image, videoUrl, videoType, publishedAt, durationMinutes,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  videoUrl?: string | null;
  videoType?: "direct" | "iframe";
  publishedAt?: string | null;
  durationMinutes?: number;
}) {
  // A real publication date, playable source and thumbnail are required; never invent them.
  if (!videoUrl || !image || !description || !publishedAt || !Number.isFinite(Date.parse(publishedAt))) return null;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${absoluteUrl(path)}#video`,
    name: title,
    description,
    thumbnailUrl: [absoluteUrl(image)],
    uploadDate: new Date(publishedAt).toISOString(),
    ...(videoType === "iframe" ? { embedUrl: absoluteUrl(videoUrl) } : { contentUrl: absoluteUrl(videoUrl) }),
    duration: durationMinutes && durationMinutes > 0 ? `PT${durationMinutes}M` : undefined,
    inLanguage: "ar",
    mainEntityOfPage: absoluteUrl(path),
  };
}
