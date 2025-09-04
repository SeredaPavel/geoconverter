// /geoconverter/frontend/src/components/Splash.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Показывается:
 *  - при первом заходе в текущей вкладке (sessionStorage.splashShown != "1")
 *  - при рефреше главной страницы "/"
 * Не показывается на внутренних маршрутах и при клиентской навигации.
 */
export default function Splash() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // Решение: показываем только на "/" и если это первый заход в сессию
  // или если тип навигации == "reload" (страница перезагружена).
  const shouldShow = useMemo(() => {
    if (pathname !== "/") return false;
    try {
      const nav = performance?.getEntriesByType?.("navigation")?.[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isReload = nav?.type === "reload";
      const firstTime = sessionStorage.getItem("splashShown") !== "1";
      return firstTime || isReload;
    } catch {
      // На всякий случай — если API недоступно, ведём себя как "первый раз"
      return pathname === "/";
    }
  }, [pathname]);

  useEffect(() => {
    if (!shouldShow) return;

    setVisible(true);
    // Зафиксируем, что пользователь уже видел сплэш в этой вкладке
    try {
      sessionStorage.setItem("splashShown", "1");
    } catch {}

    // Авто-снятие через 2.4s (анимация рамки 1.8s + штора 0.7s с overlap)
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, [shouldShow]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-white dark:bg-slate-950 overflow-hidden"
      aria-hidden
    >
      {/* Центровая надпись с бегущей подсвеченной рамкой */}
      <div className="splash-box splash-run select-none">
        ГЕОКОНВЕРТЕР
      </div>

      {/* Штора снизу → вверх, стартует после рамки */}
      <div className="splash-curtain" />
    </div>
  );
}
