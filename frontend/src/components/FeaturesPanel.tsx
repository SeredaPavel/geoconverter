// /geoconverter/frontend/src/components/FeaturesPanel.tsx
"use client";

import { useState, type RefObject } from "react";

type FeaturesPanelProps = {
  donateInputRef?: RefObject<HTMLInputElement>;
};

export default function FeaturesPanel({ donateInputRef }: FeaturesPanelProps) {
  const [donateMenuOpen, setDonateMenuOpen] = useState(false);

  return (
    <div className="grid gap-4 md:gap-5 md:grid-cols-2">
      {/* О геоконвертере */}
      <section className="card p-4 md:p-5 space-y-3">
        <div className="text-base md:text-lg font-semibold">
          О геоконвертере
        </div>
        <p className="text-sm md:text-base opacity-80">
          Здесь позже появится подробное описание возможностей и сценариев
          использования ГеоКонвертера.
        </p>
      </section>

      {/* Donate */}
      <section className="card p-4 md:p-5 space-y-3">
        <div className="text-base md:text-lg font-semibold">
          Donate - поддержите автора сервиса
        </div>
        <p className="text-sm opacity-80">
          Укажите сумму и выберите удобный способ перевода. Тексты и реквизиты
          добавим на следующем шаге.
        </p>

        <div className="space-y-2">
          <label className="text-xs opacity-70">Сумма</label>
          <div className="relative">
            <input
              ref={donateInputRef}
              className="input w-full"
              type="number"
              min={0}
              step={100}
              placeholder="Например, 500 ₽"
            />
          </div>
        </div>

        <div className="relative mt-2 inline-block">
          <button
            type="button"
            className="btn btn-primary btn-md px-5"
            onClick={() => setDonateMenuOpen((v) => !v)}
          >
            Перевести
          </button>

          {donateMenuOpen && (
            <div className="dropdown-menu right-0 mt-2 min-w-48">
              {["СБП", "Юmoney", "СберБанк", "Т-Банк"].map((method) => (
                <button
                  key={method}
                  type="button"
                  className="btn h-10 w-full justify-start text-sm md:text-base"
                  onClick={() => setDonateMenuOpen(false)}
                >
                  {method}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
