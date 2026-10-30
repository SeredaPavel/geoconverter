import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api", "/healthz"],
    },
    sitemap: "https://geoconverter.ru/sitemap.xml",
  };
}
