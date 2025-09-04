// /geoconverter/frontend/src/app/page.tsx
"use client";
import { useState } from "react";
import ConverterPanel from "@/components/ConverterPanel";

function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M8 5v14l11-7-11-7z" fill="currentColor"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function Page() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Плавающие шэр-иконки (левый нижний угол) */}
      <div className="social-fab">
        {/* Telegram */}
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent("https://geoconverter.ru")}&text=${encodeURIComponent("ГеоКонвертер — конвертация координат")}`}
          target="_blank" rel="noreferrer" aria-label="Поделиться в Telegram" title="Поделиться в Telegram"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-80" fill="currentColor">
            <path d="M9.036 15.08l-.376 5.3c.54 0 .777-.232 1.057-.51l2.54-2.433 5.268 3.865c.966.533 1.655.253 1.916-.895l3.47-16.24h.001c.308-1.438-.52-1.999-1.453-1.651L1.1 8.96c-1.404.546-1.383 1.332-.239 1.695l5.454 1.7L19.36 6.27c.65-.426 1.243-.19.756.236L9.036 15.08z"/>
          </svg>
        </a>
        {/* WhatsApp */}
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent("ГеоКонвертер — https://geoconverter.ru")}`}
          target="_blank" rel="noreferrer" aria-label="Поделиться в WhatsApp" title="Поделиться в WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-80" fill="currentColor">
            <path d="M20.52 3.48A11.92 11.92 0 0012.06 0 11.92 11.92 0 000 11.92a11.7 11.7 0 001.59 5.95L0 24l6.29-1.64a11.91 11.91 0 005.77 1.48h.01A11.92 11.92 0 0024 11.93a11.83 11.83 0 00-3.48-8.45zM12.07 21.5a9.56 9.56 0 01-4.88-1.33l-.35-.21-3.72.97 1-3.63-.23-.37a9.53 9.53 0 1118.05-4.99 9.54 9.54 0 01-9.87 9.56zm5.48-7.12c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.67.15-.77.97-.94 1.17-.35.22-.64.07a7.77 7.77 0 01-2.28-1.41 8.59 8.59 0 01-1.58-1.96c-.17-.3 0-.46.13-.61.13-.15.3-.38.45-.58.15-.2.2-.35.3-.58s.05-.43-.02-.58c-.07-.15-.67-1.62-.92-2.22s-.5-.5-.67-.5h-.57a1.1 1.1 0 00-.8.38c-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09a9.83 9.83 0 003.6 3.35c.5.27.9.43 1.21.55.51.2.97.17 1.33.1.41-.06 1.28-.52 1.46-1.02.18-.5.18-.93.12-1.02-.06-.09-.24-.15-.54-.3z"/>
          </svg>
        </a>
        {/* Скопировать/Share */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (navigator.share) navigator.share({ url: "https://geoconverter.ru", title: "ГеоКонвертер" });
            else { navigator.clipboard.writeText("https://geoconverter.ru"); alert("Ссылка скопирована"); }
          }}
          aria-label="Поделиться ссылкой" title="Поделиться ссылкой"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-80" fill="currentColor">
            <path d="M13 5.8V9h-2V3h6v2h-3.2A8 8 0 1120 12h-2a6 6 0 10-5 5.91V16h2v5h-6v-2h3.04A8 8 0 1113 5.8z"/>
          </svg>
        </a>
      </div>

      {/* Hero с кнопкой */}
      <section id="start" className="relative">
        <div
          className="h-[72vh] md:h-[78vh] grid place-items-center"
          style={{
            backgroundImage: "url(/assets/earth_hero.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <button className="btn btn-primary text-lg px-6 shadow-soft" onClick={() => setOpen(true)}>
            <IconPlay /> Запуск конвертера
          </button>
        </div>
      </section>

      {/* Модал с конвертером */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-8 md:top-10">
            <div className="max-w-[1200px] mx-auto px-4">
              <div className="card p-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xl font-semibold">ГеоКонвертер</div>
                  <button className="btn" onClick={() => setOpen(false)}><IconClose /></button>
                </div>
                <ConverterPanel />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Примечание MVP */}
      <div className="max-w-[1200px] mx-auto px-4 my-10 text-sm opacity-70">
        Внимание: в этом MVP полностью работает WGS-84 → WGS-84 (демо). Остальные системы подключим после добавления гридов и реестра.
      </div>
    </>
  );
}
