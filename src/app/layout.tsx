import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SiteShell } from "@/components/site-shell";
import { SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import { pageRobots } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/branding/cartoony-logo.png", type: "image/png" },
    ],
    shortcut: ["/branding/cartoony-logo.png"],
    apple: [
      { url: "/branding/cartoony-logo.png", type: "image/png" },
    ],
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  openGraph: {
    siteName: SITE_NAME,
    locale: "ar_SA",
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_IMAGE,
        width: 940,
        height: 600,
        alt: "شعار كارتوني",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE],
  },
  robots: pageRobots(),
};

export const viewport: Viewport = {
  themeColor: "#121B32",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
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
