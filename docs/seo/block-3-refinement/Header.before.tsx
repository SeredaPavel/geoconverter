// /geoconverter/frontend/src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import GlobeLogo from "./GlobeLogo";
import type { PanelType } from "@/lib/panels";

/* Иконки c поддержкой className для размера */
function IconBurger(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props} aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconClose(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props} aria-hidden>
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type NavItem = {
  id: "start" | "features" | "faq" | "support";
  label: string;
  panel: PanelType;
};

const navItems: NavItem[] = [
  { id: "start", label: "Запуск", panel: "converter" },
  { id: "features", label: "Возможности", panel: "features" },
  { id: "faq", label: "FAQ", panel: "faq" },
  { id: "support", label: "Поддержать проект", panel: "support" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // блокируем скролл страницы, когда открыто мобильное меню
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleNavClick = (item: NavItem) => {
    if (typeof window === "undefined") return;
    const detail: { panel: PanelType } = {
      panel: item.panel,
    };

    window.dispatchEvent(
      new CustomEvent("gc-open-panel", {
        detail,
      })
    );
  };

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-40 transition-all text-slate-100",
        mobileOpen
          ? "bg-black/40" // при открытом меню убираем backdrop-blur, чтобы overlay нормально ловил тапы
          : scrolled
          ? "backdrop-blur bg-black/40"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="max-w-[1200px] mx-auto px-4 py-2 flex items-center gap-3">
        {/* Лого + название */}
        <Link href="/" className="flex items-center gap-3 select-none">
          <div className="shrink-0">
            <GlobeLogo
              size={80}
              textureUrl="/images/earth_equirect.jpeg"
              atmosphere
              initialRotation={0.55}
              tiltX={0.7}
              tiltZ={0}
              uvZoom={0.97}
              uvShift={0.015}
              uvZoomY={0.995}
              uvShiftY={0.0}
              rotationSpeed={0.01}
            />
          </div>
          <span className="font-semibold tracking-wide text-xl md:text-2xl">
            ГеоКонвертер
          </span>
        </Link>

        {/* Десктоп-меню */}
        <nav className="ml-auto hidden lg:flex items-center gap-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                "btn btn-ghost h-11 text-base " +
                (item.id === "start" ? "font-semibold" : "font-medium")
              }
              onClick={() => handleNavClick(item)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Мобайл: бургер + подпись «Меню» */}
        <nav className="ml-auto lg:hidden flex items-center">
          <button
            className="btn btn-ghost h-11 px-3 text-sm gap-2"
            aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <IconClose className="w-5 h-5" />
            ) : (
              <IconBurger className="w-6 h-6" />
            )}
            <span>Меню</span>
          </button>
        </nav>
      </div>

      {/* Мобильное меню */}
      {mobileOpen && (
        <>
          {/* затемнение */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          {/* панель-меню */}
          <div className="fixed right-4 top-[72px] z-50 w-56 lg:hidden">
            <div
              className="theme-menu rounded-2xl border border-slate-200/50 dark:border-slate-700/50
                            bg-white/90 dark:bg-slate-900/10 text-slate-900 dark:text-slate-100 backdrop-blur p-2 shadow-soft"
            >
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="btn btn-ghost h-10 w-full justify-start text-base"
                  onClick={() => {
                    setMobileOpen(false);
                    handleNavClick(item);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
