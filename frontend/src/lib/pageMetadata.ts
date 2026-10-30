import type { Metadata } from "next";

export function pageMetadata(title: string, description: string, canonical: string): Metadata {
  const fullTitle = `${title} | ГеоКонвертер`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website", locale: "ru_RU", siteName: "ГеоКонвертер",
      title: fullTitle, description, url: canonical,
      images: [{ url: "/assets/og-geoconverter.png", width: 1200, height: 630, alt: "ГеоКонвертер — конвертер координат онлайн" }],
    },
  };
}
