import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icon";
import { CategoryArt } from "@/components/illustrations";
import { MovieCard } from "@/components/movie-card";
import { categories } from "@/lib/movies";
import { getPublicPublishedCatalog } from "@/lib/movies-public";
import { matchesCategory } from "@/lib/content-links";
import { pageMetadata, pageRobots } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) return { robots: pageRobots(false) };
  if (category.slug === "movies") permanentRedirect("/movies");
  const catalog = await getPublicPublishedCatalog();
  return pageMetadata({
    title: `أفلام ومسلسلات كرتون ${category.label}`,
    description: `استكشف أفلام ومسلسلات الكرتون في تصنيف ${category.label} على كارتوني. ${category.caption}، وتفاصيل الأعمال والحلقات المتاحة في المكتبة.`,
    path: `/category/${category.slug}`,
    index: catalog.ok && catalog.movies.some((item) => matchesCategory(item, category.slug)),
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "movies") permanentRedirect("/movies");
  const activeCategory = categories.find((cat) => cat.slug === slug);

  if (!activeCategory) {
    notFound();
  }

  const { ok, error, movies: publishedMovies } = await getPublicPublishedCatalog();

  const matchingMovies = publishedMovies.filter((item) => matchesCategory(item, activeCategory.slug));

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <JsonLd data={breadcrumbJsonLd([
        { name: "الرئيسية", path: "/" },
        { name: activeCategory.label, path: `/category/${activeCategory.slug}` },
      ])} />
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

        {!ok && error && (
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
          </div>
        )}
        {matchingMovies.length === 0 ? ok ? (
          <div className="public-state-box" role="status">
            <p>لا توجد عروض منشورة في تصنيف «{activeCategory.label}» حالياً.</p>
          </div>
        ) : null : (
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
