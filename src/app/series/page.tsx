import Link from "next/link";
import { CategoryStrip } from "@/components/category-strip";
import { Icon } from "@/components/icon";
import { MovieCard } from "@/components/movie-card";
import { getPublicPublishedSeries } from "@/lib/movies-public";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "مسلسلات كرتون | كارتوني",
  description: "استكشف قائمة مسلسلات الرسوم المتحركة وحكايات الأنمي في مكتبة كارتوني.",
  alternates: { canonical: "/series" },
  openGraph: {
    title: "مسلسلات كرتون | كارتوني",
    description: "استكشف قائمة مسلسلات الرسوم المتحركة وحكايات الأنمي في مكتبة كارتوني.",
    type: "website",
  },
};

export default async function SeriesListingPage() {
  const { ok, error, movies: seriesList } = await getPublicPublishedSeries();

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      <section
        className="content-section"
        style={{ paddingTop: "48px", paddingBottom: "24px" }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">مكتبة مسلسلات كارتوني</span>
            <h1>
              مسلسلات كرتون
              <span style={{ color: "var(--orange)" }}>.</span>
            </h1>
            <p className="section-note" style={{ marginTop: "6px" }}>
              جميع المسلسلات المنشورة في مكتبة كارتوني ({seriesList.length} مسلسل)
            </p>
          </div>

          <Link href="/" className="text-button">
            <span>العودة للرئيسية</span>
            <Icon name="arrow" size={17} />
          </Link>
        </div>
      </section>

      <CategoryStrip />

      <section
        className="stories-section content-section"
        aria-labelledby="series-catalog-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">العروض المتاحة للمشاهدة</span>
            <h2 id="series-catalog-title">
              قائمة المسلسلات المنشورة
              <span>.</span>
            </h2>
          </div>
        </div>

        {!ok && error ? (
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
          </div>
        ) : seriesList.length === 0 ? (
          <div className="public-state-box" role="status">
            <p>لا توجد مسلسلات منشورة في المكتبة حالياً.</p>
          </div>
        ) : (
          <div className="movie-grid">
            {seriesList.map((series) => (
              <MovieCard key={series.id} movie={series} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
