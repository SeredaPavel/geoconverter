// /geoconverter/frontend/src/components/Header.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? "backdrop-blur bg-white/65 dark:bg-slate-950/65 border-b border-slate-200/70 dark:border-slate-800" : ""}`}>
      <div className="container flex items-center gap-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/assets/geoconverter_logo.svg" alt="ГеоКонвертер" width={36} height={36} />
          <span className="font-semibold tracking-wide">ГеоКонвертер</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <a className="btn btn-ghost" href="#features">Возможности</a>
          <a className="btn btn-ghost" href="#faq">FAQ</a>
          <a className="btn btn-primary" href="#start">Запуск</a>
        </nav>
      </div>
    </header>
  );
}
