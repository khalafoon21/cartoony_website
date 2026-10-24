import { HomePage } from "@/components/home-page";
import { getPublicHomepageSections } from "@/lib/movies-public";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { ok, error, sections } = await getPublicHomepageSections();

  return (
    <HomePage
      sections={sections}
      dbError={!ok ? error : undefined}
    />
  );
}
