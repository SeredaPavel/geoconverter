import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import LandingContent from "@/components/LandingContent";

const title = "Конвертер координат онлайн — WGS84, МСК, СК-42";
const description =
  "Перевод координат между WGS84, МСК, СК-42, СК-95, ГСК-2011 и UTM. Пакетная обработка, импорт и экспорт Excel. Выбор системы и зоны.";

export const metadata: Metadata = {
  title: { absolute: `${title} | ГеоКонвертер` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "ГеоКонвертер",
    title: `${title} | ГеоКонвертер`,
    description,
    images: [
      {
        url: "/assets/og-geoconverter.png",
        width: 1200,
        height: 630,
        alt: "ГеоКонвертер — конвертер координат онлайн",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ГеоКонвертер`,
    description,
    images: ["/assets/og-geoconverter.png"],
  },
};

export default function Page() {
  return (
    <HomePage>
      <LandingContent />
    </HomePage>
  );
}
