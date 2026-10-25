"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/icon";
import { MovieRow } from "@/components/movie-row";
import { PublishedArtwork } from "@/components/published-artwork";
import { SITE_URL } from "@/lib/site";
import type { Movie } from "@/lib/movies";
import type { PublicSeason } from "@/lib/movies-public";

export function PublicSeriesView({
  series,
  seasons,
  related,
}: {
  series: Movie;
  seasons: PublicSeason[];
  related: Movie[];
}) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    seasons[0]?.id ?? ""
  );

  const heroImageUrl = series.backdropUrl || series.posterUrl;
  const categoryBadges =
    series.categoryLabels && series.categoryLabels.length > 0
      ? series.categoryLabels
      : [series.categoryLabel];

  const currentSeason =
    seasons.find((s) => s.id === selectedSeasonId) ?? seasons[0];

  const seriesJsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: series.title,
    alternateName: series.englishTitle || undefined,
    description: series.description,
    image: series.posterUrl || series.backdropUrl || undefined,
    datePublished: `${series.year}-01-01`,
    inLanguage: "ar",
    numberOfSeasons: seasons.length,
    numberOfEpisodes: seasons.reduce((acc, s) => acc + s.episodes.length, 0),
    ...(Number(series.rating) > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: series.rating,
            bestRating: "10",
            worstRating: "0",
          },
        }
      : {}),
    url: `${SITE_URL}/series/${series.slug}`,
  };

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesJsonLd) }}
      />
      {/* Series Hero Section */}
      <section
        className="hero"
        aria-labelledby="series-detail-title"
        style={{ "--theme-accent": series.accent } as CSSProperties}
      >
        <div className="hero-art-stack" aria-hidden="true">
          <div className="hero-art is-active">
            <PublishedArtwork
              src={heroImageUrl}
              className="hero-real-backdrop scene-art"
              eager
            />
          </div>
        </div>

        <div className="hero-content">
          <p className="hero-english" dir="ltr">
            {series.englishTitle}
          </p>

          <h1 id="series-detail-title">{series.title}</h1>
          {series.subtitle && <p className="hero-subtitle">{series.subtitle}</p>}

          <div className="movie-meta">
            <span className="meta-pill">{series.year}</span>
            <span className="meta-dot" />
            {categoryBadges.map((catLabel) => (
              <span key={catLabel} className="meta-pill is-category">
                {catLabel}
              </span>
            ))}
            <span className="meta-dot" />
            <span className="meta-pill">{series.audioBadge}</span>
            <span className="meta-dot" />
            <span className="meta-pill">
              {seasons.length > 0 ? `${seasons.length} مواسم` : "مسلسل كرتوني"}
            </span>
            {series.ageRating && (
              <span className="age-badge" dir="ltr">
                {series.ageRating}
              </span>
            )}
          </div>

          <p className="hero-description">{series.description}</p>

          <div className="hero-actions">
            {seasons[0]?.episodes?.[0] && (
              <Link
                href={`/watch/series/${series.slug}/${seasons[0].episodes[0].slug}`}
                className="primary-button"
              >
                <Icon name="play" size={18} />
                <span>بدء المشاهدة</span>
              </Link>
            )}

            <Link href="/series" className={seasons[0]?.episodes?.[0] ? "text-button" : "primary-button"}>
              <Icon name="sparkles" size={18} />
              <span>تصفح المسلسلات</span>
            </Link>

            <Link href="/" className="text-button">
              <span>العودة للرئيسية</span>
              <Icon name="arrow" size={17} />
            </Link>
          </div>

          <div className="hero-footnote">
            <span className="rating">
              <Icon name="star" size={15} />
              <b dir="ltr">{series.rating}</b>
            </span>
            <span>عالم {series.franchise}</span>
            <span className="meta-dot" />
            <span>مسلسل كرتوني</span>
          </div>
        </div>
      </section>

      {/* Seasons & Episodes Content Section */}
      <section
        className="content-section public-series-seasons"
        aria-labelledby="episodes-heading"
        style={{ paddingTop: "24px", paddingBottom: "48px" }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">قائمة الحلقات والمشاهدة</span>
            <h2 id="episodes-heading">
              حلقات المسلسل
              <span style={{ color: "var(--orange)" }}>.</span>
            </h2>
          </div>
        </div>

        {seasons.length === 0 ? (
          <div className="public-state-box" role="status">
            <p>لا توجد مواسم أو حلقات منشورة لهذا المسلسل حالياً.</p>
          </div>
        ) : (
          <>
            {/* Season Pills / Tabs */}
            {seasons.length > 1 && (
              <div
                className="public-seasons-nav"
                role="tablist"
                aria-label="مواسم المسلسل"
              >
                {seasons.map((season) => {
                  const isActive = season.id === currentSeason?.id;
                  return (
                    <button
                      key={season.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`public-season-pill ${isActive ? "is-active" : ""}`}
                      onClick={() => setSelectedSeasonId(season.id)}
                    >
                      <span>{season.title}</span>
                      <small>({season.episodes.length} حلقة)</small>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Current Season Episodes Grid */}
            {!currentSeason || currentSeason.episodes.length === 0 ? (
              <div className="public-state-box" role="status">
                <p>لا توجد حلقات معروضة حالياً لهذا الموسم.</p>
              </div>
            ) : (
              <div className="public-episodes-grid">
                {currentSeason.episodes.map((episode) => (
                  <article
                    key={episode.id}
                    className="public-episode-card"
                    aria-label={`الحلقة ${episode.episodeNumber}: ${episode.title}`}
                  >
                    <div className="public-ep-thumb-wrap">
                      {episode.stillUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={episode.stillUrl}
                          alt={episode.title}
                          className="public-ep-thumb"
                          loading="lazy"
                        />
                      ) : (
                        <div className="public-ep-placeholder">
                          <Icon name="sparkles" size={28} />
                        </div>
                      )}
                      <span className="public-ep-badge-num">
                        حلقة {episode.episodeNumber}
                      </span>
                      <span className="public-ep-duration">
                        {episode.durationLabel}
                      </span>
                    </div>

                    <div className="public-ep-content">
                      <div className="public-ep-title-row">
                        <h3 className="public-ep-title">{episode.title}</h3>
                        {episode.originalTitle && (
                          <span
                            dir="ltr"
                            style={{
                              fontSize: "11px",
                              color: "#8FA3BF",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {episode.originalTitle}
                          </span>
                        )}
                      </div>

                      {episode.description && (
                        <p className="public-ep-desc">{episode.description}</p>
                      )}

                      <div className="public-ep-footer">
                        <span className="meta-pill">{episode.audioBadge}</span>
                        <Link
                          href={`/watch/series/${series.slug}/${episode.slug}`}
                          className="public-ep-watch-btn"
                        >
                          <Icon name="play" size={13} />
                          <span>مشاهدة الحلقة</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Related Content Row */}
      {related.length > 0 && (
        <MovieRow
          id="related-stories"
          eyebrow="من مكتبة كارتوني"
          title="قد يعجبك أيضاً"
          subtitle="اكتشف المزيد من الحكايات والمسلسلات"
          movies={related}
          viewAllHref="/series"
        />
      )}
    </main>
  );
}
