import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icon";
import { PublishedArtwork } from "@/components/published-artwork";
import { MovieRow } from "@/components/movie-row";
import { getPublicContentBySlug } from "@/lib/movies-public";
import { getContentHref } from "@/lib/content-links";
import { SITE_URL } from "@/lib/site";
import type { ContentFormat } from "@/lib/movies";

export async function getContentMetadata(slug: string, format: ContentFormat): Promise<Metadata> {
  const { item } = await getPublicContentBySlug(slug, format);
  if (!item) return { robots: { index: false, follow: false } };
  const ogImage = item.backdropUrl || item.posterUrl;
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: getContentHref(item) },
    openGraph: {
      title: item.title,
      description: item.description,
      type: format === "movie" ? "video.movie" : "video.tv_show",
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export async function PublicContentDetails({
  slug,
  format,
}: {
  slug: string;
  format: ContentFormat;
}) {
  const { ok, error, item: movie, related } = await getPublicContentBySlug(slug, format);

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

  const movieJsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    alternateName: movie.englishTitle || undefined,
    description: movie.description,
    image: movie.posterUrl || movie.backdropUrl || undefined,
    datePublished: `${movie.year}-01-01`,
    inLanguage: "ar",
    ...(Number(movie.rating) > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: movie.rating,
            bestRating: "10",
            worstRating: "0",
          },
        }
      : {}),
    url: `${SITE_URL}${getContentHref(movie)}`,
  };

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(movieJsonLd) }}
      />
      <section
        className="hero"
        aria-labelledby="movie-detail-title"
        style={{ "--theme-accent": movie.accent } as CSSProperties}
      >
        <div className="hero-art-stack" aria-hidden="true">
          <div className="hero-art is-active">
            <PublishedArtwork src={heroImageUrl} className="hero-real-backdrop scene-art" eager />
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
            {movie.duration && <><span className="meta-dot" /><span>{movie.duration}</span></>}
            {movie.ageRating && <span className="age-badge" dir="ltr">{movie.ageRating}</span>}
          </div>

          <p className="hero-description">{movie.description}</p>

          <div className="hero-actions">
            <Link href={`/watch/movies/${movie.slug}`} className="primary-button">
              <Icon name="play" size={20} />
              <span>مشاهدة الفيلم</span>
            </Link>

            <Link href="/movies" className="text-button">
              <Icon name="film" size={18} />
              <span>تصفح كل الأفلام</span>
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

      {related.length > 0 && <MovieRow
        id="related-stories"
        eyebrow="من مكتبة كارتوني"
        title="قد يعجبك أيضاً"
        subtitle="اكتشف المزيد من الحكايات"
        movies={related}
        viewAllHref="/movies"
      />}
    </main>
  );
}
