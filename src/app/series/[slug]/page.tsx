import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentMetadata } from "@/components/public-content-details";
import { PublicSeriesView } from "@/components/public-series-view";
import { Icon } from "@/components/icon";
import { getPublicSeriesWithDetails } from "@/lib/movies-public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return getContentMetadata((await params).slug, "series");
}

export default async function SeriesDetailsPage({ params }: Props) {
  const { slug } = await params;
  const { ok, error, item, seasons, related } = await getPublicSeriesWithDetails(slug);

  if (!ok && error) {
    return (
      <main id="main-content" className="site-main" tabIndex={-1}>
        <section className="content-section" style={{ paddingTop: "72px" }}>
          <div className="public-state-box is-error" role="alert">
            <p>{error}</p>
            <Link href="/series" className="text-button" style={{ marginTop: "12px" }}>
              <span>العودة إلى المسلسلات</span>
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!item) {
    notFound();
  }

  return (
    <PublicSeriesView
      series={item}
      seasons={seasons}
      related={related}
    />
  );
}
