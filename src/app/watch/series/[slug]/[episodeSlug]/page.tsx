import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { EpisodeWatchView } from "@/components/episode-watch-view";
import { getPublicEpisodeWithContext } from "@/lib/movies-public";

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
    return { robots: { index: false, follow: false } };
  }

  const title = `مشاهدة ${series.title}: ${currentEpisode.title} (${currentSeason.title}) | كارتوني`;
  const description = currentEpisode.description || series.description;
  const image = currentEpisode.stillUrl || series.backdropUrl || series.posterUrl;

  return {
    title,
    description,
    alternates: { canonical: `/watch/series/${series.slug}/${currentEpisode.slug}` },
    openGraph: {
      title,
      description,
      type: "video.episode",
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
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

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
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
