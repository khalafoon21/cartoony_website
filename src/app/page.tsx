import { HomePage } from "@/components/home-page";
import { getPublicHomepageSections } from "@/lib/movies-public";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

export default async function Page() {
  const { ok, error, sections, heroSlides } = await getPublicHomepageSections();

  return (
    <HomePage
      sections={sections}
      heroSlides={heroSlides}
      dbError={!ok ? error : undefined}
    />
  );
}
