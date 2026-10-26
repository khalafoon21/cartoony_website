import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { MovieRow } from "@/components/movie-row";
import { VideoPlayer } from "@/components/video-player";
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

  const categoryBadges =
    movie.categoryLabels && movie.categoryLabels.length > 0
      ? movie.categoryLabels
      : [movie.categoryLabel];

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <div className="watch-page-container">
        {/* Top Navigation Bar */}
        <div className="watch-top-nav">
          <Link href={`/movies/${movie.slug}`} className="watch-back-link">
            <Icon name="arrow" size={18} />
            <span>العودة لصفحة الفيلم</span>
          </Link>
          <div className="watch-breadcrumb">
            <Link href="/movies">الأفلام</Link>
            <span className="meta-dot" />
            <span className="current">{movie.title}</span>
          </div>
        </div>

        {/* Video Player or Friendly Unavailable State */}
        <div className="watch-player-frame">
          {movie.videoUrl ? (
            <VideoPlayer
              src={movie.videoUrl}
              poster={movie.backdropUrl || movie.posterUrl}
              title={movie.title}
              subtitleUrl={movie.subtitleUrl}
              subtitleLang={movie.subtitleLang}
              accentColor={movie.accent}
              contentId={movie.id}
              contentType="movie"
              videoType={movie.videoType}
              servers={movie.servers}
            />
          ) : (
            <div className="watch-unavailable-card">
              <div className="unavailable-icon-bubble">
                <Icon name="sparkles" size={40} />
              </div>
              <h2>الفيديو غير متاح للمشاهدة الآن</h2>
              <p>
                لم تتم إضافة رابط تشغيل مباشر لهذا الفيلم بعد. نعمل دائماً على تحديث
                المكتبة وإضافة محتوى مرخص وجديد.
              </p>
              <div className="unavailable-actions">
                <Link href={`/movies/${movie.slug}`} className="primary-button">
                  <Icon name="sparkles" size={16} />
                  <span>عرض تفاصيل الفيلم</span>
                </Link>
                <Link href="/movies" className="text-button">
                  <span>تصفح باقي الأفلام</span>
                  <Icon name="arrow" size={16} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Movie Info Section */}
        <section className="watch-info-section" aria-labelledby="watch-movie-title">
          <div className="watch-info-header">
            <div>
              <p className="hero-english" dir="ltr">
                {movie.englishTitle}
              </p>
              <h1 id="watch-movie-title" className="watch-title">
                {movie.title}
              </h1>
              {movie.subtitle && <p className="watch-subtitle">{movie.subtitle}</p>}
            </div>

            <div className="watch-badges-row">
              <span className="meta-pill">{movie.year}</span>
              <span className="meta-dot" />
              {categoryBadges.map((cat) => (
                <span key={cat} className="meta-pill is-category">
                  {cat}
                </span>
              ))}
              <span className="meta-dot" />
              <span className="meta-pill">{movie.audioBadge}</span>
              {movie.duration && (
                <>
                  <span className="meta-dot" />
                  <span>{movie.duration}</span>
                </>
              )}
              {movie.ageRating && (
                <span className="age-badge" dir="ltr">
                  {movie.ageRating}
                </span>
              )}
            </div>
          </div>

          <p className="watch-description">{movie.description}</p>
        </section>

        {/* Related Content */}
        {related.length > 0 && (
          <section className="watch-related-section">
            <MovieRow
              id="watch-movie-related"
              title="أعمال أخرى قد تعجبك"
              eyebrow="مزيد من الحكايات"
              movies={related}
            />
          </section>
        )}
      </div>
    </main>
  );
}
