import "server-only";

// Identify unchanged legacy fixtures without hiding real records that reuse a slug.
const SAMPLE_CONTENT_SIGNATURES = [
  ["moon-forest", "حُرّاس الغابة", "FOREST GUARDIANS"],
  ["little-orbit", "كوكب صغير", "LITTLE ORBIT"],
  ["ocean-tales", "حكايات المرجان", "CORAL TALES"],
  ["sunny-days", "شِلّة مشمش", "SUNNY SIDE UP"],
  ["cloud-house", "بيت فوق السحاب", "ABOVE THE CLOUDS"],
  ["starlight-express", "قطار النجوم", "STARLIGHT EXPRESS"],
  ["desert-knights", "فرسان الواحة", "OASIS KNIGHTS"],
  ["whispering-lantern", "فانوس الحكايات", "WHISPERING LANTERN"],
  ["sakura-wind", "أجنحة الساكورا", "SAKURA WINGS"],
  ["captain-sabir", "القبطان صابر", "CAPTAIN SABIR"],
  ["robo-bakery", "مخبز الآليين", "ROBO BAKERY"],
  ["emerald-valley", "وادي الزمرد", "EMERALD VALLEY"],
  ["sky-racers", "سابقو الغيوم", "SKY RACERS"],
  ["deep-blue-band", "فرقة الأعماق", "DEEP BLUE BAND"],
] as const;

export function isSampleContent(row: {
  slug: string;
  title_ar: string;
  title_original: string;
}): boolean {
  return SAMPLE_CONTENT_SIGNATURES.some(
    ([slug, titleAr, titleOriginal]) =>
      row.slug === slug &&
      row.title_ar === titleAr &&
      row.title_original === titleOriginal
  );
}
