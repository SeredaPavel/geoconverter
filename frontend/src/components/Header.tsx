// /geoconverter/frontend/src/components/Header.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const GlobeLogo = dynamic(() => import("./GlobeLogo"), { ssr: false });

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
            <div className="max-w-[1200px] mx-auto px-4 flex items-center gap-4 py-3">
                <Link href="/" className="flex items-center gap-3">
                    {/* фикс: правильное расширение и только поддерживаемые пропы */}
                    <GlobeLogo
                        size={80}
                        textureUrl="/images/earth_equirect.jpeg"  // проверь расширение!
                        atmosphere
                        // ориентация
                        initialRotation={0.55}  // долготa (Y)
                        tiltX={0.7}           // наклон к зрителю северным полушарием
                        tiltZ={0}
                        // UV легкая коррекция
                        uvZoom={0.97}
                        uvShift={0.015}
                        uvZoomY={0.995}
                        uvShiftY={0.0}
                        // скорость
                        rotationSpeed={0.01}
                    />
                    <span className="font-semibold tracking-wide text-lg md:text-xl">ГеоКонвертер</span>
                </Link>
                <nav className="ml-auto flex items-center gap-2">
                    <a className="btn btn-ghost h-11 text-base md:text-lg font-medium" href="#features">Возможности</a>
                    <a className="btn btn-ghost h-11 text-base md:text-lg font-medium" href="#faq">FAQ</a>
                    <a className="btn btn-ghost h-11 text-base md:text-lg font-semibold" href="#start">Запуск</a>
                </nav>
            </div>
        </header>
    );
}
