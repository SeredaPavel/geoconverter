// /geoconverter/frontend/src/components/FeaturesPanel.tsx
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type FeaturesPanelProps = {
  donateInputRef?: RefObject<HTMLInputElement>;
  /** Флаг от хедера: открыть панель с фокусом на Donate */
  forceActive?: boolean;
};

export default function FeaturesPanel({
  donateInputRef,
  forceActive = false,
}: FeaturesPanelProps) {
  const [donateMenuOpen, setDonateMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Если пришёл сигнал forceActive — ещё раз пробуем сфокусировать поле
  useEffect(() => {
    if (forceActive && donateInputRef?.current) {
      donateInputRef.current.focus();
    }
  }, [forceActive, donateInputRef]);

  // Закрываем меню при клике/тапе ВНЕ самой выпадашки
  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (!donateMenuOpen) return;
      const target = event.target as Node | null;
      if (!target || !dropdownRef.current) return;

      if (!dropdownRef.current.contains(target)) {
        setDonateMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [donateMenuOpen]);

  return (
    <div className="grid gap-4 md:gap-5">
      {/* О геоконвертере */}
      <section className="card p-4 md:p-5 space-y-3">
        <div className="text-base md:text-lg font-semibold">
          О геоконвертере
        </div>
        <p className="text-sm md:text-base opacity-80">
          GeoConverter — это удобный онлайн-сервис для быстрого преобразования
          координат между различными форматами и системами. В персчете используется
          движок, который используют QGIS/GDAL/PROJ. Он поможет вам
          легко получить нужный формат для карт без установки дополнительного
          ПО и сложных настроек.
        </p>
        <p className="text-sm md:text-base opacity-80">
          GeoConverter предоставляется бесплатно, однако его поддержка требует
          времени и ресурсов. Если сервис оказался полезен и помог вам в работе —
          у вас есть возможность поддержать его развитие и отблагодарить
          создателя. Это позволит проекту продолжать работать и радовать вас
          новыми возможностями.
        </p>
      </section>

      {/* Donate */}
      <section
        className="
          card card-overflow-visible relative z-10
          p-4 md:p-5 space-y-3
          focus-within:border-brand-500
          focus-within:ring-1 focus-within:ring-brand-400/50
        "
      >
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
              className="input w-full md:w-1/2"
              type="number"
              min={0}
              step={100}
              placeholder="Например 500 ₽"
            />
          </div>
        </div>

        <div className="relative mt-3 inline-block">
          <button
            type="button"
            className="btn btn-primary btn-md px-5"
            onClick={() => setDonateMenuOpen((v) => !v)}
          >
            Перевести
          </button>

          {donateMenuOpen && (
            <div
              ref={dropdownRef}
              className="dropdown-menu left-0 mt-2 min-w-48 z-20 space-y-1"
            >
              {["СБП", "Юmoney", "СберБанк", "Т Банк"].map((method) => (
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

      {/* Сервис для вас */}
      <section className="card p-4 md:p-5 space-y-3">
        <div className="text-base md:text-lg font-semibold">
          Сервис для вас
        </div>
        <p className="text-sm md:text-base opacity-80">
          GeoConverter — это современный и понятный инструмент для работы с
          координатами, созданный специально для тех, кто ценит скорость,
          точность и удобство. Сервис позволяет преобразовывать координаты
          между популярными системами и форматами, такими как WGS84, SK-42,
          SK-95, ПЗ-90, UTM, МСК и многими другими — всего в несколько кликов.
        </p>
        <div className="text-sm md:text-base opacity-80 space-y-1">
          <div>Главные преимущества GeoConverter:</div>
          <ul className="list-none space-y-1 mt-1">
            <li>✅ мгновенная конвертация без установки программ</li>
            <li>✅ поддержка множества систем координат и форматов</li>
            <li>✅ высокая точность расчетов</li>
            <li>✅ удобный и простой интерфейс</li>
            <li>✅ работает прямо в браузере на любом устройстве</li>
            <li>✅ отсутствие регистрации и лишних шагов</li>
          </ul>
        </div>
        <p className="text-sm md:text-base opacity-80">
          В отличие от аналогичных сервисов, GeoConverter делает акцент на
          удобстве пользователя: всё работает быстро, понятно и доступно даже
          тем, кто впервые сталкивается с задачей преобразования координат.
          Для профессионалов он экономит время, для новичков — снимает
          технические сложности.
        </p>
        <p className="text-sm md:text-base opacity-80">
          Сервис создавался с вниманием к деталям и реальным потребностям
          пользователей — от инженеров и картографов до туристов, геодезистов
          и разработчиков. Он постоянно развивается и поддерживается автором,
          чтобы оставаться надёжным бесплатным инструментом.
        </p>
      </section>
    </div>
  );
}
