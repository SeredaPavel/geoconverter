// /geoconverter/frontend/src/components/Splash.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  text?: string;
  /** Кастомизация размеров/цветов через CSS-переменные (необязательно) */
  vars?: Partial<{
    splashCurtainBg: string;
    borderColor: string;
    textColor: string;
    boxPadY: string;
    boxPadX: string;
    boxRadius: string;
    boxFont: string;
    borderThickness: string;
    borderGlow: string;
    borderDuration: string;
    curtainDuration: string;
  }>;
};

export default function Splash({
  text = "ГЕОКОНВЕРТЕР",
  vars,
}: Props) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const initialPathname = useRef(pathname);
  const showOnMount = useRef<boolean | null>(null);

  useEffect(() => {
    // Decide once per layout mount. Preserve the decision during Strict Mode replay
    // so effect cleanup can safely cancel and recreate the animation timer.
    if (showOnMount.current === null) {
      let firstVisit = true;
      try {
        firstVisit = sessionStorage.getItem("splashShown") !== "1";
        sessionStorage.setItem("splashShown", "1");
      } catch {}
      showOnMount.current = firstVisit && initialPathname.current === "/";
    }
    if (!showOnMount.current) return;
    setVisible(true);

    // Время = бег рамки + штора
    const total = 1800 + 700 + 150; // мс (небольшой запас)
    const t = setTimeout(() => setVisible(false), total);
    return () => clearTimeout(t);
  }, []);

  // Leaving home during the animation dismisses it; returning never restarts it.
  useEffect(() => {
    if (pathname !== "/") setVisible(false);
  }, [pathname]);

  if (!visible) return null;

  // инлайн задаём CSS-переменные (опционально)
  const styleVars: React.CSSProperties = {
    ...(vars?.splashCurtainBg && { ['--splash-curtain-bg' as any]: vars.splashCurtainBg }),
    ...(vars?.borderColor && { ['--splash-border-color' as any]: vars.borderColor }),
    ...(vars?.textColor && { ['--splash-text-color' as any]: vars.textColor }),
    ...(vars?.boxPadY && { ['--splash-box-pad-y' as any]: vars.boxPadY }),
    ...(vars?.boxPadX && { ['--splash-box-pad-x' as any]: vars.boxPadX }),
    ...(vars?.boxRadius && { ['--splash-box-radius' as any]: vars.boxRadius }),
    ...(vars?.boxFont && { ['--splash-box-font' as any]: vars.boxFont }),
    ...(vars?.borderThickness && { ['--splash-border-thickness' as any]: vars.borderThickness }),
    ...(vars?.borderGlow && { ['--splash-border-glow' as any]: vars.borderGlow }),
    ...(vars?.borderDuration && { ['--splash-border-duration' as any]: vars.borderDuration }),
    ...(vars?.curtainDuration && { ['--splash-curtain-duration' as any]: vars.curtainDuration }),
  };

  return (
    <div className="splash-overlay" style={styleVars} aria-hidden>
      <div className="splash-box splash-fade-out select-none">
        {text}
      </div>
      <div className="splash-curtain" />
    </div>
  );
}
