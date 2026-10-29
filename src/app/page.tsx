import { HomePage } from "@/components/home-page";
import { getPublicHomepageSections } from "@/lib/movies-public";
import { getHomepageSectionsSettings } from "@/lib/homepage-admin";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

export default async function Page() {
  const sectionsConfig = await getHomepageSectionsSettings();
  const { ok, error, sections, heroSlides, allMovies } = await getPublicHomepageSections(sectionsConfig);

  return (
    <HomePage
      sections={sections}
      heroSlides={heroSlides}
      allMovies={allMovies}
      dbError={!ok ? error : undefined}
    />
  );
}
