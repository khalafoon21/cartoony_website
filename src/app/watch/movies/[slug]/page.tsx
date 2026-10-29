import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { MovieWatchView } from "@/components/movie-watch-view";
import { getPublicContentBySlug } from "@/lib/movies-public";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { item: movie } = await getPublicContentBySlug(slug, "movie");
  if (!movie) return { robots: { index: false, follow: false } };
  const image = movie.backdropUrl || movie.posterUrl;
  return {
    title: `مشاهدة ${movie.title} | كارتوني`,
    description: movie.description,
    alternates: { canonical: `/watch/movies/${movie.slug}` },
    openGraph: {
      title: `مشاهدة فيلم ${movie.title}`,
      description: movie.description,
      type: "video.movie",
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `مشاهدة فيلم ${movie.title}`,
      description: movie.description,
      ...(image ? { images: [image] } : {}),
    },
  };
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

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <MovieWatchView movie={movie} related={related} />
    </main>
  );
}
