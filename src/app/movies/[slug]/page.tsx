import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icon";
import { SceneArt } from "@/components/illustrations";
import { MovieRow } from "@/components/movie-row";
import { getPublicContentBySlug } from "@/lib/movies-public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { item } = await getPublicContentBySlug(slug);
  if (!item) return { robots: { index: false, follow: false } };
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: `/movies/${encodeURIComponent(item.slug)}` },
    openGraph: {
      title: item.title,
      description: item.description,
      ...(item.posterUrl ? { images: [item.posterUrl] } : {}),
    },
  };
}

export default async function MovieDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { ok, error, item: movie, related } = await getPublicContentBySlug(slug);

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

  const heroImageUrl = movie.backdropUrl || movie.posterUrl;
  const categoryBadges =
    movie.categoryLabels && movie.categoryLabels.length > 0
      ? movie.categoryLabels
      : [movie.categoryLabel];

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <section
        className="hero"
        aria-labelledby="movie-detail-title"
        style={{ "--theme-accent": movie.accent } as CSSProperties}
      >
        <div className="hero-art-stack" aria-hidden="true">
          <div className="hero-art is-active">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl}
                alt=""
                className="hero-real-backdrop scene-art"
                fetchPriority="high"
              />
            ) : (
              <SceneArt theme={movie.theme} />
            )}
          </div>
        </div>

        <div className="hero-content">
          <p className="hero-english" dir="ltr">
            {movie.englishTitle}
          </p>

          <h1 id="movie-detail-title">{movie.title}</h1>
          {movie.subtitle && <p className="hero-subtitle">{movie.subtitle}</p>}

          <div className="movie-meta">
            <span className="meta-pill">{movie.year}</span>
            <span className="meta-dot" />
            {categoryBadges.map((catLabel) => (
              <span key={catLabel} className="meta-pill is-category">
                {catLabel}
              </span>
            ))}
            <span className="meta-dot" />
            <span className="meta-pill">{movie.audioBadge}</span>
            <span className="meta-dot" />
            <span>{movie.duration}</span>
            <span className="age-badge" dir="ltr">
              {movie.ageRating || "6+"}
            </span>
          </div>

          <p className="hero-description">{movie.description}</p>

          <div className="hero-actions">
            <Link href="/movies" className="primary-button">
              <span className="play-icon-wrap">
                <Icon name="play" size={20} />
              </span>
              <span>بدء المشاهدة التجريبية</span>
            </Link>

            <Link href="/" className="text-button">
              <span>العودة للرئيسية</span>
              <Icon name="arrow" size={17} />
            </Link>
          </div>

          <div className="hero-footnote">
            <span className="rating">
              <Icon name="star" size={15} />
              <b dir="ltr">{movie.rating}</b>
            </span>
            <span>عالم {movie.franchise}</span>
            <span className="meta-dot" />
            <span>{movie.format === "series" ? "مسلسل كرتوني" : "فيلم كرتوني"}</span>
          </div>
        </div>
      </section>

      <MovieRow
        id="related-stories"
        eyebrow="حكايات مشابهة"
        title="قد يعجبك أيضاً"
        subtitle="مغامرات مختارة من نفس عوالم كارتوني"
        movies={related}
        viewAllHref="/movies"
      />
    </main>
  );
}
