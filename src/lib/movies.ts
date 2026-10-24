export type Category = "all" | "adventure" | "comedy" | "fantasy" | "space" | "family";
export type ArtTheme = "forest" | "space" | "ocean" | "desert" | "sky";

export type Movie = {
  id: string;
  title: string;
  subtitle: string;
  franchise: string;
  englishTitle: string;
  description: string;
  category: Category;
  categoryLabel: string;
  year: number;
  duration: string;
  rating: string;
  theme: ArtTheme;
  accent: string;
};

export const movies: Movie[] = [
  { id: "moon-forest", title: "حُرّاس الغابة", subtitle: "سرّ القمر الأزرق", franchise: "حُرّاس الغابة", englishTitle: "FOREST GUARDIANS", description: "حين يخفت ضوء القمر، ينطلق ليث وصديقته نُورا في رحلة إلى قلب الغابة المنسية. بين أشجارٍ تهمس ونجومٍ ترشد الطريق، يكتشفان أن أعظم قوة هي الصداقة… وأن أصغر الأبطال قد يصنع أكبر الحكايات.", category: "adventure", categoryLabel: "مغامرة", year: 2026, duration: "١ ساعة و٣٢ دقيقة", rating: "8.7", theme: "forest", accent: "#F5A623" },
  { id: "little-orbit", title: "كوكب صغير", subtitle: "مغامرة خارج المدار", franchise: "كوكب صغير", englishTitle: "LITTLE ORBIT", description: "رسالة صغيرة من نجم بعيد تقلب يوم رائد الفضاء سليم رأسًا على عقب. انضم إليه وإلى رفيقه الآلي في رحلة مليئة بالضحك بين الكواكب، بحثًا عن طريق العودة إلى البيت.", category: "space", categoryLabel: "فضاء", year: 2026, duration: "١ ساعة و٢٤ دقيقة", rating: "8.5", theme: "space", accent: "#A99CD5" },
  { id: "ocean-tales", title: "حكايات المرجان", subtitle: "وراء الموجة الأخيرة", franchise: "حكايات المرجان", englishTitle: "CORAL TALES", description: "تحت أمواج البحر تختبئ مدينة لا يعرفها أحد. تتبع لؤلؤة خريطة قديمة لتكتشف عالماً من الألوان والأصدقاء، وتتعلم أن الشجاعة تبدأ بخطوة صغيرة إلى المجهول.", category: "fantasy", categoryLabel: "خيال", year: 2025, duration: "١ ساعة و٢٨ دقيقة", rating: "8.3", theme: "ocean", accent: "#75C9C0" },
  { id: "sunny-days", title: "شِلّة مشمش", subtitle: "يوم خارج التوقعات", franchise: "شِلّة مشمش", englishTitle: "SUNNY SIDE UP", description: "مشمش وأصدقاؤه لديهم خطة مثالية للعطلة… أو هكذا يظنون! دراجة عنيدة وخريطة مقلوبة ومغامرات مضحكة تجعل هذا اليوم حكاية لا تُنسى.", category: "comedy", categoryLabel: "كوميديا", year: 2025, duration: "١ ساعة و١٨ دقيقة", rating: "8.1", theme: "desert", accent: "#E9AA7A" },
  { id: "cloud-house", title: "بيت فوق السحاب", subtitle: "حيث تبدأ الأحلام", franchise: "بيت السحاب", englishTitle: "ABOVE THE CLOUDS", description: "من نافذة بيتها العائم، تحلم غيمة برؤية العالم. حكاية دافئة عن العائلة والخيال والأماكن الجميلة التي نصل إليها حين نؤمن بأحلامنا.", category: "family", categoryLabel: "عائلي", year: 2026, duration: "١ ساعة و٢٦ دقيقة", rating: "8.6", theme: "sky", accent: "#E6B5C2" },
];

export const categories: { id: Category; label: string; caption: string; symbol: "compass" | "popcorn" | "planet" | "magic" | "home" }[] = [
  { id: "adventure", label: "مغامرات", caption: "إلى عوالم جديدة", symbol: "compass" },
  { id: "comedy", label: "كوميديا", caption: "ضحكة من القلب", symbol: "popcorn" },
  { id: "fantasy", label: "خيال وسحر", caption: "كل شيء ممكن", symbol: "magic" },
  { id: "space", label: "عالم الفضاء", caption: "أبعد من النجوم", symbol: "planet" },
  { id: "family", label: "لكل العائلة", caption: "لحظات تجمعنا", symbol: "home" },
];
