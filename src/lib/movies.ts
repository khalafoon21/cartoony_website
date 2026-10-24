export type CategorySlug =
  | "movies"
  | "action"
  | "adventure"
  | "comedy"
  | "family"
  | "fantasy"
  | "anime";

export type Category = "all" | CategorySlug | "space";

export type CategorySymbol =
  | "clapper"
  | "bolt"
  | "compass"
  | "popcorn"
  | "home"
  | "magic"
  | "anime"
  | "planet";

export type ArtTheme = "forest" | "space" | "ocean" | "desert" | "sky";

export type AudioBadge = "مدبلج" | "مترجم";

export type ContentFormat = "movie" | "series";

export type MovieSectionId = "most-watched" | "recently-added" | "cartoon-movies" | "cartoon-series";

export type Movie = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  franchise: string;
  englishTitle: string;
  description: string;
  category: Category;
  categoryLabel: string;
  categories?: CategorySlug[];
  categoryLabels?: string[];
  posterUrl?: string | null;
  backdropUrl?: string | null;
  ageRating?: string;
  year: number;
  duration: string;
  rating: string;
  theme: ArtTheme;
  accent: string;
  audioBadge: AudioBadge;
  format: ContentFormat;
  featured?: boolean;
  mostWatched?: boolean;
  recentlyAdded?: boolean;
};

export type CategoryItem = {
  id: CategorySlug;
  slug: CategorySlug;
  label: string;
  englishLabel: string;
  caption: string;
  symbol: CategorySymbol;
  lightColor: string;
  darkColor: string;
};

export type HomepageSectionConfig = {
  id: MovieSectionId;
  eyebrow: string;
  title: string;
  subtitle: string;
  items: Movie[];
};

export const categories: CategoryItem[] = [
  { id: "movies", slug: "movies", label: "أفلام", englishLabel: "Movies", caption: "سهرات سينمائية ممتعة", symbol: "clapper", lightColor: "#8A6D53", darkColor: "#3D3138" },
  { id: "action", slug: "action", label: "أكشن", englishLabel: "Action", caption: "حماس وإثارة بلا توقف", symbol: "bolt", lightColor: "#945B4F", darkColor: "#472D35" },
  { id: "adventure", slug: "adventure", label: "مغامرات", englishLabel: "Adventure", caption: "إلى عوالم جديدة", symbol: "compass", lightColor: "#676249", darkColor: "#2C3D3B" },
  { id: "comedy", slug: "comedy", label: "كوميديا", englishLabel: "Comedy", caption: "ضحكة من القلب", symbol: "popcorn", lightColor: "#975950", darkColor: "#4C3440" },
  { id: "family", slug: "family", label: "عائلي", englishLabel: "Family", caption: "لحظات تجمعنا", symbol: "home", lightColor: "#93696B", darkColor: "#4F394B" },
  { id: "fantasy", slug: "fantasy", label: "خيال", englishLabel: "Fantasy", caption: "كل شيء ممكن", symbol: "magic", lightColor: "#64537E", darkColor: "#35344D" },
  { id: "anime", slug: "anime", label: "أنمي", englishLabel: "Anime", caption: "روائع الرسوم اليابانية", symbol: "anime", lightColor: "#5E718A", darkColor: "#2E3A4E" },
];
