import { getContentMetadata, PublicContentDetails } from "@/components/public-content-details";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return getContentMetadata((await params).slug, "series");
}

export default async function SeriesDetailsPage({ params }: Props) {
  return <PublicContentDetails slug={(await params).slug} format="series" />;
}
