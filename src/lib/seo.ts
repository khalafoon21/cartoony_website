import type { Metadata } from "next";
import { absoluteUrl, SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME } from "./site";

export function pageRobots(index = true): Metadata["robots"] {
  const production = process.env.VERCEL_ENV !== "preview";
  return {
    index: production && index,
    follow: production,
    googleBot: {
      index: production && index,
      follow: production,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  index = true,
}: {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  type?: "website" | "video.movie" | "video.tv_show" | "video.episode";
  index?: boolean;
}): Metadata {
  const summary = (description || SITE_DESCRIPTION).replace(/\s+/g, " ").trim();
  const shortDescription = summary.length > 180
    ? `${summary.slice(0, 177).replace(/\s+\S*$/, "")}…`
    : summary;
  const socialTitle = `${title} | ${SITE_NAME}`;
  const imageUrl = absoluteUrl(image || SITE_IMAGE);
  const imageAlt = image ? title : `شعار ${SITE_NAME}`;

  return {
    title,
    description: shortDescription,
    alternates: { canonical: absoluteUrl(path) },
    robots: pageRobots(index),
    openGraph: {
      title: socialTitle,
      description: shortDescription,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      locale: "ar_SA",
      type,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: shortDescription,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
  };
}
