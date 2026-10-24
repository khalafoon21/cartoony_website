import Link from "next/link";
import { CategoryStrip } from "@/components/category-strip";
import { Icon } from "@/components/icon";
import { MovieCard } from "@/components/movie-card";
import { getPublicPublishedMovies } from "@/lib/movies-public";

export const dynamic = "force-dynamic";
export const metadata = { title: "أفلام كرتون", alternates: { canonical: "/movies" } };

export default async function MoviesListingPage() {
  const { ok, error, movies } = await getPublicPublishedMovies();

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <section
        className="content-section"
        style={{ paddingTop: "48px", paddingBottom: "24px" }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">مكتبة أفلام كارتوني</span>
            <h1>
              أفلام كرتون
              <span style={{ color: "var(--orange)" }}>.</span>
            </h1>
            <p className="section-note" style={{ marginTop: "6px" }}>
              جميع الأفلام المنشورة في مكتبة كارتوني ({movies.length} فيلم)
            </p>
          </div>

          <Link href="/" className="text-button">
            <span>العودة للرئيسية</span>
            <Icon name="arrow" size={17} />
          </Link>
        </div>
      </section>

      <CategoryStrip activeSlug="movies" />

      <section
        className="stories-section content-section"
        aria-labelledby="movies-catalog-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">العروض المتاحة للمشاهدة</span>
            <h2 id="movies-catalog-title">
              قائمة الأفلام المنشورة
              <span>.</span>
            </h2>
          </div>
        </div>

        {!ok && error ? (
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="public-state-box" role="status">
            <p>لا توجد أفلام منشورة في المكتبة حالياً.</p>
          </div>
        ) : (
          <div className="movie-grid">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
