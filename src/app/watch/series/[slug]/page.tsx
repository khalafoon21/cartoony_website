import { notFound, redirect } from "next/navigation";
import { getPublicSeriesWithDetails } from "@/lib/movies-public";

export const dynamic = "force-dynamic";

export default async function SeriesWatchIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { item: series, seasons } = await getPublicSeriesWithDetails(slug);

  if (!series) {
    notFound();
  }

  // Find first published episode in the first available season
  for (const season of seasons) {
    if (season.episodes.length > 0) {
      redirect(`/watch/series/${series.slug}/${season.episodes[0].slug}`);
    }
  }

  // If no episodes are published yet, redirect back to series overview page
  redirect(`/series/${series.slug}`);
}
