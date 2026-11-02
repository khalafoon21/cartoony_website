export const SITE_URL = "https://www.cartoony.site";
export const SITE_NAME = "كارتوني";
export const SITE_TITLE = "كارتوني | لكل عالم حكاية — أفلام ومسلسلات كرتون مدبلجة ومترجمة";
export const SITE_DESCRIPTION =
  "اكتشف أفلام ومسلسلات الكرتون المدبلجة والمترجمة على كارتوني. تصفح تفاصيل الأعمال وقصصها، واستكشف المواسم والحلقات والأعمال المضافة حديثاً.";
export const SITE_IMAGE = "/branding/cartoony-logo.png";

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).href;
}
