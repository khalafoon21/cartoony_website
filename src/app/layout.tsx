import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SiteShell } from "@/components/site-shell";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "كارتوني | لكل حكاية عالم", template: "%s | كارتوني" },
  description: "اكتشف عالم كارتوني؛ حكايات ملهمة ومغامرات ممتعة في واجهة عربية لكل العائلة.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    siteName: "كارتوني",
    locale: "ar_SA",
    type: "website",
    url: SITE_URL,
    title: "كارتوني | لكل حكاية عالم",
    description: "اكتشف عالم كارتوني؛ حكايات ملهمة ومغامرات ممتعة في واجهة عربية لكل العائلة.",
    images: [
      {
        url: "/branding/cartoony-logo.png",
        width: 1200,
        height: 630,
        alt: "شعار كارتوني",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "كارتوني | لكل حكاية عالم",
    description: "اكتشف عالم كارتوني؛ حكايات ملهمة ومغامرات ممتعة في واجهة عربية لكل العائلة.",
    images: ["/branding/cartoony-logo.png"],
  },
  robots: {
    index: process.env.VERCEL_ENV !== "preview",
    follow: process.env.VERCEL_ENV !== "preview",
  },
};

export const viewport: Viewport = {
  themeColor: "#121B32",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "كارتوني",
  alternateName: "Cartoony",
  url: SITE_URL,
  inLanguage: "ar",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-cream antialiased">
        <SiteShell>{children}</SiteShell>
        <Script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
