// /geoconverter/frontend/src/app/layout.tsx
import "./../styles/globals.css";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import Splash from "@/components/Splash";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "ГеоКонвертер",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body
        className="
          min-h-screen
          bg-[url('/assets/earth_hero.jpg')] bg-cover bg-center
          md:bg-fixed
        "
      >
        <div className="bg-black/10 dark:bg-black/20 min-h-screen">
          <Header />
          <main className="max-w-[1200px] mx-auto px-4 py-6">
            {children}
          </main>
        </div>
        <Splash />
      </body>
    </html>
  );
}
