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

export const allMovies: Movie[] = [
  {
    id: "moon-forest",
    slug: "moon-forest",
    title: "حُرّاس الغابة",
    subtitle: "سرّ القمر الأزرق",
    franchise: "حُرّاس الغابة",
    englishTitle: "FOREST GUARDIANS",
    description:
      "حين يخفت ضوء القمر، ينطلق ليث وصديقته نُورا في رحلة إلى قلب الغابة المنسية. بين أشجارٍ تهمس ونجومٍ ترشد الطريق، يكتشفان أن أعظم قوة هي الصداقة… وأن أصغر الأبطال قد يصنع أكبر الحكايات.",
    category: "adventure",
    categoryLabel: "مغامرات",
    year: 2026,
    duration: "١ ساعة و٣٢ دقيقة",
    rating: "8.7",
    theme: "forest",
    accent: "#F5A623",
    audioBadge: "مدبلج",
    format: "movie",
    featured: true,
    mostWatched: true,
    recentlyAdded: true,
  },
  {
    id: "little-orbit",
    slug: "little-orbit",
    title: "كوكب صغير",
    subtitle: "مغامرة خارج المدار",
    franchise: "كوكب صغير",
    englishTitle: "LITTLE ORBIT",
    description:
      "رسالة صغيرة من نجم بعيد تقلب يوم رائد الفضاء سليم رأسًا على عقب. انضم إليه وإلى رفيقه الآلي في رحلة مليئة بالضحك بين الكواكب، بحثًا عن طريق العودة إلى البيت.",
    category: "action",
    categoryLabel: "أكشن",
    year: 2026,
    duration: "١ ساعة و٢٤ دقيقة",
    rating: "8.5",
    theme: "space",
    accent: "#A99CD5",
    audioBadge: "مدبلج",
    format: "movie",
    featured: true,
    mostWatched: true,
  },
  {
    id: "ocean-tales",
    slug: "ocean-tales",
    title: "حكايات المرجان",
    subtitle: "وراء الموجة الأخيرة",
    franchise: "حكايات المرجان",
    englishTitle: "CORAL TALES",
    description:
      "تحت أمواج البحر تختبئ مدينة لا يعرفها أحد. تتبع لؤلؤة خريطة قديمة لتكتشف عالماً من الألوان والأصدقاء، وتتعلم أن الشجاعة تبدأ بخطوة صغيرة إلى المجهول.",
    category: "fantasy",
    categoryLabel: "خيال",
    year: 2025,
    duration: "١ ساعة و٢٨ دقيقة",
    rating: "8.3",
    theme: "ocean",
    accent: "#75C9C0",
    audioBadge: "مدبلج",
    format: "movie",
    featured: true,
    mostWatched: true,
  },
  {
    id: "sunny-days",
    slug: "sunny-days",
    title: "شِلّة مشمش",
    subtitle: "يوم خارج التوقعات",
    franchise: "شِلّة مشمش",
    englishTitle: "SUNNY SIDE UP",
    description:
      "مشمش وأصدقاؤه لديهم خطة مثالية للعطلة… أو هكذا يظنون! دراجة عنيدة وخريطة مقلوبة ومغامرات مضحكة تجعل هذا اليوم حكاية لا تُنسى.",
    category: "comedy",
    categoryLabel: "كوميديا",
    year: 2025,
    duration: "٢٤ حلقة",
    rating: "8.1",
    theme: "desert",
    accent: "#E9AA7A",
    audioBadge: "مدبلج",
    format: "series",
    featured: true,
    mostWatched: true,
  },
  {
    id: "cloud-house",
    slug: "cloud-house",
    title: "بيت فوق السحاب",
    subtitle: "حيث تبدأ الأحلام",
    franchise: "بيت السحاب",
    englishTitle: "ABOVE THE CLOUDS",
    description:
      "من نافذة بيتها العائم، تحلم غيمة برؤية العالم. حكاية دافئة عن العائلة والخيال والأماكن الجميلة التي نصل إليها حين نؤمن بأحلامنا.",
    category: "family",
    categoryLabel: "عائلي",
    year: 2026,
    duration: "١ ساعة و٢٦ دقيقة",
    rating: "8.6",
    theme: "sky",
    accent: "#E6B5C2",
    audioBadge: "مدبلج",
    format: "movie",
    featured: true,
    recentlyAdded: true,
  },
  {
    id: "starlight-express",
    slug: "starlight-express",
    title: "قطار النجوم",
    subtitle: "رحلة عبر المجرات",
    franchise: "قطار النجوم",
    englishTitle: "STARLIGHT EXPRESS",
    description:
      "قطار ليلي يظهر مرة كل عام ليحمل المسافرين الصغار عبر سُحب الكواكب البعيدة في رحلة تبحث عن نجمة الأمنيات المفقودة.",
    category: "fantasy",
    categoryLabel: "خيال",
    year: 2026,
    duration: "١ ساعة و٣٥ دقيقة",
    rating: "8.8",
    theme: "space",
    accent: "#9BA8E5",
    audioBadge: "مترجم",
    format: "movie",
    mostWatched: true,
    recentlyAdded: true,
  },
  {
    id: "desert-knights",
    slug: "desert-knights",
    title: "فرسان الواحة",
    subtitle: "أسطورة الرمال الذهبية",
    franchise: "فرسان الواحة",
    englishTitle: "OASIS KNIGHTS",
    description:
      "ثلاثة أصدقاء يحمون واحة قديمة من العواصف الرملية الغامضة باستخدام بوصلة أثرية وأجنحة شراعية سريعة.",
    category: "action",
    categoryLabel: "أكشن",
    year: 2025,
    duration: "١٨ حلقة",
    rating: "8.4",
    theme: "desert",
    accent: "#F0AD64",
    audioBadge: "مدبلج",
    format: "series",
    mostWatched: true,
  },
  {
    id: "whispering-lantern",
    slug: "whispering-lantern",
    title: "فانوس الحكايات",
    subtitle: "أسرار الوادي الأخضر",
    franchise: "فانوس الحكايات",
    englishTitle: "WHISPERING LANTERN",
    description:
      "كلما أضاء الفانوس الصغير في المساء، تتحول الرسومات القديمة في دفتر جدّي إلى مغامرات تنبض بالحياة.",
    category: "family",
    categoryLabel: "عائلي",
    year: 2026,
    duration: "٢٠ حلقة",
    rating: "8.6",
    theme: "forest",
    accent: "#7CC49E",
    audioBadge: "مدبلج",
    format: "series",
    recentlyAdded: true,
  },
  {
    id: "sakura-wind",
    slug: "sakura-wind",
    title: "أجنحة الساكورا",
    subtitle: "مدرسة الرياح",
    franchise: "أجنحة الساكورا",
    englishTitle: "SAKURA WINGS",
    description:
      "طالبة طيران شابة تتدرب مع طائر أسطوري للتحليق فوق الجزر المعلقة وإنقاذ قريتها من الضباب الأزرق.",
    category: "anime",
    categoryLabel: "أنمي",
    year: 2026,
    duration: "١ ساعة و٤٠ دقيقة",
    rating: "8.9",
    theme: "sky",
    accent: "#E899B5",
    audioBadge: "مترجم",
    format: "movie",
    mostWatched: true,
    recentlyAdded: true,
  },
  {
    id: "captain-sabir",
    slug: "captain-sabir",
    title: "القبطان صابر",
    subtitle: "جزيرة الصدى",
    franchise: "القبطان صابر",
    englishTitle: "CAPTAIN SABIR",
    description:
      "سفينة خشبية تطير وتغوص في آنٍ واحد تقود طاقمها المضحك إلى جزيرة تردّد الألحان وتفتح أبواب الكنوز.",
    category: "adventure",
    categoryLabel: "مغامرات",
    year: 2024,
    duration: "٢٦ حلقة",
    rating: "8.2",
    theme: "ocean",
    accent: "#6BC2C8",
    audioBadge: "مدبلج",
    format: "series",
  },
  {
    id: "robo-bakery",
    slug: "robo-bakery",
    title: "مخبز الآليين",
    subtitle: "وصفة السعادة",
    franchise: "مخبز الآليين",
    englishTitle: "ROBO BAKERY",
    description:
      "آلي صغير يعشق إعداد الفطائر يقرر افتتاح مخبز في مدينة المستقبل، لكن فرنه الذكي يبتكر كعكات تطير في الهواء!",
    category: "comedy",
    categoryLabel: "كوميديا",
    year: 2026,
    duration: "١ ساعة و١٦ دقيقة",
    rating: "8.0",
    theme: "desert",
    accent: "#F2B872",
    audioBadge: "مدبلج",
    format: "movie",
    recentlyAdded: true,
  },
  {
    id: "emerald-valley",
    slug: "emerald-valley",
    title: "وادي الزمرد",
    subtitle: "حكاية الفصول الأربعة",
    franchise: "وادي الزمرد",
    englishTitle: "EMERALD VALLEY",
    description:
      "في وادٍ تتجاور فيه الفصول الأربعة، يتعاون حراس الطبيعة الصغار لإعادة التوازن إلى شجرة المواسم.",
    category: "fantasy",
    categoryLabel: "خيال",
    year: 2025,
    duration: "١٦ حلقة",
    rating: "8.5",
    theme: "forest",
    accent: "#88C98A",
    audioBadge: "مترجم",
    format: "series",
    recentlyAdded: true,
  },
  {
    id: "sky-racers",
    slug: "sky-racers",
    title: "سابقو الغيوم",
    subtitle: "كأس الأفق الكبير",
    franchise: "سابقو الغيوم",
    englishTitle: "SKY RACERS",
    description:
      "سباق وديّ بين طائرات ورقية عملاقة فوق قمم الجبال السحابية يجمع أمهر الطيارين الصغار من كل مدينة.",
    category: "anime",
    categoryLabel: "أنمي",
    year: 2025,
    duration: "٢٢ حلقة",
    rating: "8.4",
    theme: "sky",
    accent: "#98B8E8",
    audioBadge: "مترجم",
    format: "series",
    mostWatched: true,
  },
  {
    id: "deep-blue-band",
    slug: "deep-blue-band",
    title: "فرقة الأعماق",
    subtitle: "سمفونية اللؤلؤ",
    franchise: "فرقة الأعماق",
    englishTitle: "DEEP BLUE BAND",
    description:
      "مجموعة من الكائنات البحرية الظريفة تؤسس فرقة موسيقية لإحياء مهرجان الشعاب المرجانية السنوي.",
    category: "family",
    categoryLabel: "عائلي",
    year: 2024,
    duration: "١ ساعة و٢٠ دقيقة",
    rating: "8.1",
    theme: "ocean",
    accent: "#72C4B9",
    audioBadge: "مدبلج",
    format: "movie",
  },
];

// Trigger HMR reload
export const movies: Movie[] = allMovies.filter((movie) => movie.featured);

export const homepageSections: HomepageSectionConfig[] = [
  {
    id: "most-watched",
    eyebrow: "الأكثر شعبية الآن",
    title: "الأكثر مشاهدة",
    subtitle: "الحكايات التي أحبّها الجمهور هذا الأسبوع",
    items: allMovies.filter((m) => m.mostWatched),
  },
  {
    id: "recently-added",
    eyebrow: "جديد مكتبة كارتوني",
    title: "أُضيف حديثاً",
    subtitle: "أحدث الإصدارات والمغامرات الحصرية",
    items: allMovies.filter((m) => m.recentlyAdded),
  },
  {
    id: "cartoon-movies",
    eyebrow: "سهرات سينمائية",
    title: "أفلام كرتون",
    subtitle: "أفلام رسوم متحركة كاملة لكل العائلة",
    items: allMovies.filter((m) => m.format === "movie"),
  },
  {
    id: "cartoon-series",
    eyebrow: "حلقات متجددة",
    title: "مسلسلات كرتون",
    subtitle: "مواسم شيّقة ومغامرات متتابعة",
    items: allMovies.filter((m) => m.format === "series"),
  },
];

export const categories: CategoryItem[] = [
  { id: "movies", slug: "movies", label: "أفلام", englishLabel: "Movies", caption: "سهرات سينمائية ممتعة", symbol: "clapper", lightColor: "#8A6D53", darkColor: "#3D3138" },
  { id: "action", slug: "action", label: "أكشن", englishLabel: "Action", caption: "حماس وإثارة بلا توقف", symbol: "bolt", lightColor: "#945B4F", darkColor: "#472D35" },
  { id: "adventure", slug: "adventure", label: "مغامرات", englishLabel: "Adventure", caption: "إلى عوالم جديدة", symbol: "compass", lightColor: "#676249", darkColor: "#2C3D3B" },
  { id: "comedy", slug: "comedy", label: "كوميديا", englishLabel: "Comedy", caption: "ضحكة من القلب", symbol: "popcorn", lightColor: "#975950", darkColor: "#4C3440" },
  { id: "family", slug: "family", label: "عائلي", englishLabel: "Family", caption: "لحظات تجمعنا", symbol: "home", lightColor: "#93696B", darkColor: "#4F394B" },
  { id: "fantasy", slug: "fantasy", label: "خيال", englishLabel: "Fantasy", caption: "كل شيء ممكن", symbol: "magic", lightColor: "#64537E", darkColor: "#35344D" },
  { id: "anime", slug: "anime", label: "أنمي", englishLabel: "Anime", caption: "روائع الرسوم اليابانية", symbol: "anime", lightColor: "#5E718A", darkColor: "#2E3A4E" },
];
