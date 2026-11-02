import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { EpisodeWatchView } from "@/components/episode-watch-view";
import { getPublicEpisodeWithContext } from "@/lib/movies-public";
import { pageMetadata, pageRobots } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, episodeJsonLd, videoJsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; episodeSlug: string }>;
}): Promise<Metadata> {
  const { slug, episodeSlug } = await params;
  const { series, currentSeason, currentEpisode } = await getPublicEpisodeWithContext(
    slug,
    episodeSlug
  );

  if (!series || !currentEpisode || !currentSeason) {
    return { robots: pageRobots(false) };
  }

  const title = `${series.title} — ${currentEpisode.title}، الحلقة ${currentEpisode.episodeNumber} (${currentSeason.title})`;
  const description = currentEpisode.description || series.description;
  const image = currentEpisode.stillUrl || series.backdropUrl || series.posterUrl;

  return pageMetadata({
    title,
    description,
    path: `/watch/series/${series.slug}/${currentEpisode.slug}`,
    image,
    type: "video.episode",
    index: Boolean(currentEpisode.videoUrl),
  });
}

export default async function SeriesEpisodeWatchPage({
  params,
}: {
  params: Promise<{ slug: string; episodeSlug: string }>;
}) {
  const { slug, episodeSlug } = await params;
  const {
    ok,
    error,
    series,
    seasons,
    currentSeason,
    currentEpisode,
    previousEpisode,
    nextEpisode,
    related,
  } = await getPublicEpisodeWithContext(slug, episodeSlug);

  if (!ok && error) {
    return (
      <main id="main-content" className="site-main" tabIndex={-1}>
        <section className="content-section" style={{ paddingTop: "72px" }}>
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
            <Link href="/series" className="text-button" style={{ marginTop: "12px" }}>
              <span>العودة إلى المسلسلات</span>
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!series || !currentEpisode || !currentSeason) {
    notFound();
  }

  const watchPath = `/watch/series/${series.slug}/${currentEpisode.slug}`;
  const video = videoJsonLd({
    title: `${series.title} — ${currentEpisode.title}`,
    description: currentEpisode.description || series.description,
    path: watchPath,
    image: currentEpisode.stillUrl || series.backdropUrl || series.posterUrl,
    videoUrl: currentEpisode.videoUrl,
    videoType: currentEpisode.videoType,
    publishedAt: currentEpisode.publishedAt,
    durationMinutes: currentEpisode.durationMinutes,
  });

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <JsonLd data={[
        episodeJsonLd(series, currentSeason, currentEpisode),
        breadcrumbJsonLd([
          { name: "الرئيسية", path: "/" },
          { name: "مسلسلات كرتون", path: "/series" },
          { name: series.title, path: `/series/${series.slug}` },
          { name: currentEpisode.title, path: watchPath },
        ]),
        ...(video ? [video] : []),
      ]} />
      <EpisodeWatchView
        series={series}
        seasons={seasons}
        currentSeason={currentSeason}
        currentEpisode={currentEpisode}
        previousEpisode={previousEpisode}
        nextEpisode={nextEpisode}
        related={related}
      />
    </main>
  );
}
