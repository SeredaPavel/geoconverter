"use client";

import { useEffect, useId, useRef, useState } from "react";

type Crs = { code: string; title: string; category: string; description?: string };

export default function CrsInfo({ crs }: { crs?: Crs }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const regional = crs?.category === "msk" || crs?.category === "sk63";
  const hint = regional
    ? "X — восток, Y — север. Выберите зону, указанную в исходных данных."
    : crs?.category === "projected"
      ? "X — восток, Y — север. Ширина и номер зоны задаются в настройках ГК."
      : "Координаты: широта и долгота. Формат углов задаётся ниже.";

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    detailsRef.current?.focus();
    const onOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative space-y-2" ref={rootRef}>
      <p className="text-xs leading-5 opacity-80 min-h-10">{hint}</p>
      <button ref={buttonRef} type="button" className="btn h-8 px-3 text-xs"
        disabled={!crs} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(value => !value)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 11v6m0-10v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        О системе координат
      </button>
      {open && crs && (
        <div id={id} ref={detailsRef} tabIndex={-1} role="region" aria-labelledby={`${id}-title`}
          className="theme-menu absolute top-full left-0 z-[1003] mt-2 w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-4 shadow-soft max-h-[min(20rem,50svh)] overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 id={`${id}-title`} className="text-sm font-semibold break-words">{crs.title}</h3>
              {crs.code.startsWith("EPSG:") && <p className="text-xs opacity-70 break-all mt-1">{crs.code}</p>}
            </div>
            <button type="button" onClick={close} aria-label="Закрыть сведения о системе координат"
              className="btn h-8 w-8 !px-0 justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p className="text-xs leading-5 whitespace-pre-line break-words">{crs.description || hint}</p>
        </div>
      )}
    </div>
  );
}
