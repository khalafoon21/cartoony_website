import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { MovieWatchView } from "@/components/movie-watch-view";
import { getPublicContentBySlug } from "@/lib/movies-public";
import { pageMetadata, pageRobots } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, videoJsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { item: movie } = await getPublicContentBySlug(slug, "movie");
  if (!movie) return { robots: pageRobots(false) };
  return pageMetadata({
    title: `مشاهدة فيلم ${movie.title} ${movie.audioBadge}`,
    description: movie.description,
    path: `/watch/movies/${movie.slug}`,
    image: movie.backdropUrl || movie.posterUrl,
    type: "video.movie",
    index: Boolean(movie.videoUrl),
  });
}

export default async function MovieWatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { ok, error, item: movie, related } = await getPublicContentBySlug(slug, "movie");

  if (!ok && error) {
    return (
      <main id="main-content" className="site-main" tabIndex={-1}>
        <section className="content-section" style={{ paddingTop: "72px" }}>
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
            <Link href="/movies" className="text-button" style={{ marginTop: "12px" }}>
              <span>العودة إلى الأفلام</span>
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!movie) {
    notFound();
  }

  const video = videoJsonLd({
    title: movie.title,
    description: movie.description,
    path: `/watch/movies/${movie.slug}`,
    image: movie.backdropUrl || movie.posterUrl,
    videoUrl: movie.videoUrl,
    videoType: movie.videoType,
    publishedAt: movie.publishedAt,
    durationMinutes: movie.durationMinutes,
  });

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <JsonLd data={[
        breadcrumbJsonLd([
          { name: "الرئيسية", path: "/" },
          { name: "أفلام كرتون", path: "/movies" },
          { name: movie.title, path: `/movies/${movie.slug}` },
          { name: "مشاهدة الفيلم", path: `/watch/movies/${movie.slug}` },
        ]),
        ...(video ? [video] : []),
      ]} />
      <MovieWatchView movie={movie} related={related} />
    </main>
  );
}
