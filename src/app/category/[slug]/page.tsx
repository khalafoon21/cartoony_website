import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CategoryStrip } from "@/components/category-strip";
import { Icon } from "@/components/icon";
import { CategoryArt } from "@/components/illustrations";
import { MovieCard } from "@/components/movie-card";
import { allMovies, categories } from "@/lib/movies";
import { getPublicPublishedMovies } from "@/lib/movies-public";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const activeCategory = categories.find((cat) => cat.slug === slug);

  if (!activeCategory) {
    notFound();
  }

  const { ok, error, movies: publishedMovies } = await getPublicPublishedMovies();
  const seriesItems = allMovies.filter((m) => m.format === "series");

  const matchingMovies =
    activeCategory.slug === "movies"
      ? publishedMovies
      : [
          ...publishedMovies.filter(
            (m) =>
              m.category === activeCategory.slug ||
              m.categories?.includes(activeCategory.slug)
          ),
          ...seriesItems.filter((s) => s.category === activeCategory.slug),
        ];

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <section className="content-section" style={{ paddingTop: "48px", paddingBottom: "24px" }}>
        <div className="section-heading">
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <span
              className="category-image"
              style={
                {
                  width: "84px",
                  "--category-light": activeCategory.lightColor,
                  "--category-dark": activeCategory.darkColor,
                } as CSSProperties
              }
            >
              <CategoryArt symbol={activeCategory.symbol} />
            </span>
            <div>
              <span className="eyebrow">عالم كارتوني · {activeCategory.englishLabel}</span>
              <h1>
                {activeCategory.label}
                <span style={{ color: "var(--orange)" }}>.</span>
              </h1>
              <p className="section-note" style={{ marginTop: "6px" }}>
                {activeCategory.caption}
              </p>
            </div>
          </div>

          <Link href="/" className="text-button">
            <span>العودة للرئيسية</span>
            <Icon name="arrow" size={17} />
          </Link>
        </div>
      </section>

      <CategoryStrip activeSlug={activeCategory.slug} />

      <section className="stories-section content-section" aria-labelledby="category-stories-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">مختارات التصنيف</span>
            <h2 id="category-stories-title">
              حكايات {activeCategory.label}
              <span>.</span>
            </h2>
          </div>
        </div>

        {!ok && error ? (
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
          </div>
        ) : matchingMovies.length === 0 ? (
          <div className="public-state-box" role="status">
            <p>لا توجد عروض منشورة في تصنيف «{activeCategory.label}» حالياً.</p>
          </div>
        ) : (
          <div className="movie-grid">
            {matchingMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
