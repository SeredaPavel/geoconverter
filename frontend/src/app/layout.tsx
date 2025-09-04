// /geoconverter/frontend/src/app/layout.tsx
import "./../styles/globals.css";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import Splash from "@/components/Splash";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <title>ГеоКонвертер</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          backgroundImage: "url(/assets/earth_hero.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
        className="min-h-screen"
      >
        {/* затемняющая подложка поверх фона */}
        <div className="bg-black/30 dark:bg-black/50 min-h-screen">
          <Header />
          <main className="max-w-[1200px] mx-auto px-4 py-6">
            {children}
          </main>
        </div>

        {/* Глобальный сплэш (на всех страницах) */}
        <Splash />
      </body>
    </html>
  );
}
