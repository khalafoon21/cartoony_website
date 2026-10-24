import type { Metadata, Viewport } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "كارتوني | لكل حكاية عالم",
  description: "اكتشف عالم كارتوني؛ حكايات ملهمة ومغامرات ممتعة في واجهة عربية لكل العائلة. نموذج الواجهة للمرحلة الأولى.",
};

export const viewport: Viewport = { themeColor: "#121B32" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body className="min-h-screen bg-background font-sans text-cream antialiased"><Sidebar /><div className="page-shell">{children}</div></body></html>;
}
