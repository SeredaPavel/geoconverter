"use client";

import { useEffect, useRef, useState } from "react";

const supportMethods = ["СБП", "Юmoney"];

export default function SupportPanel() {
  const [methodsOpen, setMethodsOpen] = useState(false);
  const methodsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!methodsOpen) return;
    const onOutside = (event: PointerEvent) => {
      if (!methodsRef.current?.contains(event.target as Node)) setMethodsOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMethodsOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [methodsOpen]);

  return (
    <section className="card card-overflow-visible p-4 md:p-5 space-y-3">
      <h2 className="text-base md:text-lg font-semibold">Безвозмездный перевод автору проекта</h2>
      <div className="space-y-1 text-sm md:text-base opacity-80">
        <p>Вы можете осуществить безвозмездную поддержку без встречных услуг.</p>
        <p>Укажите сумму и выберите удобный способ перевода.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="support-amount" className="text-xs opacity-70">Сумма</label>
        <div>
          <input
            id="support-amount"
            className="input w-full md:w-1/2"
            type="number"
            min={0}
            step={100}
            placeholder="Например 500 ₽"
          />
        </div>
      </div>

      <div ref={methodsRef} className="mt-3 inline-block max-w-full">
        <button
          ref={toggleRef}
          type="button"
          className="btn btn-primary btn-md px-5"
          aria-expanded={methodsOpen}
          aria-controls="support-methods"
          onClick={() => setMethodsOpen(open => !open)}
        >
          Перевести
        </button>
        {methodsOpen && (
          <div id="support-methods" className="theme-menu mt-2 w-56 max-w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-soft space-y-1">
            {supportMethods.map(method => (
              <button
                key={method}
                type="button"
                className="btn h-10 w-full justify-between text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                disabled
                title="Способ поддержки пока не подключён"
              >
                <span>{method}</span>
                <span className="text-xs">Скоро</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
