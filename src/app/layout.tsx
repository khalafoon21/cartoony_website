import type { Metadata, Viewport } from "next";
import { Sidebar } from "@/components/sidebar";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "كارتوني | لكل حكاية عالم", template: "%s | كارتوني" },
  description: "اكتشف عالم كارتوني؛ حكايات ملهمة ومغامرات ممتعة في واجهة عربية لكل العائلة.",
  openGraph: { siteName: "كارتوني", locale: "ar_SA", type: "website" },
  ...(process.env.VERCEL_ENV === "preview" ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: "#121B32" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body className="min-h-screen bg-background font-sans text-cream antialiased"><Sidebar /><div className="page-shell">{children}</div></body></html>;
}
