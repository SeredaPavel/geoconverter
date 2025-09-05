// /geoconverter/frontend/src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import GlobeLogo from "./GlobeLogo"; // обычный импорт вашей иконки

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-40 transition-all",
        scrolled ? "backdrop-blur bg-black/40" : "bg-transparent",
      ].join(" ")}
    >
      <div className="max-w-[1200px] mx-auto px-4 py-2 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 select-none">
          <div className="shrink-0">
            <GlobeLogo
              size={80}
              textureUrl="/images/earth_equirect.jpeg" // если файл .jpg — поменяйте расширение здесь
              atmosphere
              // ориентация
              initialRotation={0.55}
              tiltX={0.7}
              tiltZ={0}
              // UV коррекция
              uvZoom={0.97}
              uvShift={0.015}
              uvZoomY={0.995}
              uvShiftY={0.0}
              // скорость
              rotationSpeed={0.01}
            />
          </div>

          <span className="font-semibold tracking-wide text-xl md:text-2xl">
            ГеоКонвертер
          </span>
        </Link>

        {/* десктоп-меню (как было по стилю) */}
        <nav className="ml-auto hidden sm:flex items-center gap-3">
          <a className="btn btn-ghost h-11 text-base font-medium" href="#features">Возможности</a>
          <a className="btn btn-ghost h-11 text-base font-medium" href="#faq">FAQ</a>
          <a className="btn btn-ghost h-11 text-base font-semibold" href="#start">Запуск</a>
        </nav>

        {/* мобильная компактная кнопка */}
        <nav className="ml-auto sm:hidden flex items-center gap-2">
          <a className="btn btn-ghost h-10 text-sm" href="#start">Запуск</a>
        </nav>
      </div>
    </header>
  );
}
