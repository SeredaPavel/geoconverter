import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/converter", "/features", "/faq", "/support"].map(path => ({
    url: `https://geoconverter.ru${path}`,
  }));
}
