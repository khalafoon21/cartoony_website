import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", ...(process.env.VERCEL_ENV === "preview"
      ? { disallow: "/" }
      : { allow: "/", disallow: ["/admin", "/admin/", "/api/"] }) },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
