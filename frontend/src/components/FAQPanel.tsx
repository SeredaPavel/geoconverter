// /geoconverter/frontend/src/components/FAQPanel.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

const faqs: FaqItem[] = [
  {
    question: "Какие системы координат поддерживаются?",
    answer: <>Доступны WGS-84, ГСК-2011, СК-42, СК-95, варианты ПЗ-90, проекции Гаусса–Крюгера, UTM и подключённые МСК и СК-63. Для региональных систем важно выбрать конкретный вариант и зону. Записи «в разработке» недоступны. <Link href="/features#systems">Системы и их настройки</Link>.</>,
  },
  {
    question: "Как выбрать зону и полушарие?",
    answer: <>Берите их из описания исходных данных. Для Гаусса–Крюгера ширина и номер зоны настраиваются независимо для каждой стороны. Для UTM на основе WGS-84 нужны номер зоны 1–60 и северное либо южное полушарие. Из X в UTM номер зоны определить нельзя. <Link href="/features#systems">Подробнее о зонах</Link>.</>,
  },
  {
    question: "Насколько точны вычисления?",
    answer: <>Точность зависит от исходной системы и её варианта, зоны, качества координат и параметров перехода. Приближённый МГГТ не заменяет официальную локализацию. Знаки после запятой и успешный обратный пересчёт сами по себе не подтверждают абсолютную точность. <Link href="/features#accuracy">Методика и ограничения точности</Link>; <Link href="/features#examples">контрольные примеры с источником</Link>.</>,
  },
  {
    question: "Чем смена формата отличается от смены системы?",
    answer: <>Десятичные градусы, градусы и минуты, градусы, минуты и секунды — разные записи одного угла. Например, 55°45′30″ = 55,7583333333°. Для изменения только формата оставьте одинаковую исходную и целевую СК. Смена системы координат — отдельное преобразование. <Link href="/converter#converter-guide-title">Краткая инструкция</Link>.</>,
  },
  {
    question: "В каком порядке вводить координаты?",
    answer: <>Для географических систем сначала вводится широта, затем долгота. Для плоских в этом сервисе X — восток, Y — север, в метрах. Обозначения в исходном документе могут отличаться: проверьте смысл осей. <Link href="/features#systems">Порядок осей и единицы</Link>.</>,
  },
  {
    question: "Как подготовить Excel и сколько строк загружается?",
    answer: <>Нужен XLSX с заголовками и ровно двумя колонками: широта/долгота или X/Y. Размер — до 1 МБ (1 000 000 байт). Импортируются первые 100 строк данных без строки заголовка. Большие таблицы разделите на части. <Link href="/features#excel">Шаблоны и правила подготовки</Link>.</>,
  },
  {
    question: "Чем отличаются каталог и ведомость?",
    answer: <>Каталог содержит результаты пересчёта. Ведомость содержит исходные и полученные координаты в одной таблице. Оба файла выгружаются в Excel из меню «Выгрузить координаты». <Link href="/features#excel">Импорт и выгрузка Excel</Link>.</>,
  },
  {
    question: "Можно ли получить несколько целевых систем сразу?",
    answer: <>За одну операцию выбирается одна целевая система. Для другого результата смените целевую СК и выполните новый пересчёт. «Реверс» меняет направление: результат становится исходными данными, а настройки сторон меняются местами.</>,
  },
  {
    question: "Что делать, если данные не принимаются или результат отличается?",
    answer: <>Проверьте исходную систему и её вариант, зону, полушарие, порядок осей и единицы. В записи углов поддерживаются точка и десятичная запятая; минуты и секунды должны быть меньше 60. Для Excel проверьте две колонки и формат XLSX. <Link href="/features#accuracy">Причины расхождения результатов</Link>.</>,
  },
  {
    question: "Нужны ли установка, регистрация и оплата?",
    answer: <>Нет. Сервис бесплатный, открывается в браузере на компьютере или телефоне и не требует регистрации. Расчёт выполняется сервером, поэтому для пересчёта нужен интернет. При желании можно <Link href="/support">поддержать проект</Link>.</>,
  },
];

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={
        "w-4 h-4 transition-transform duration-200 " +
        (open ? "rotate-180" : "rotate-0")
      }
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FAQPanel() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex((current) => (current === idx ? null : idx));
  };

  return (
    <section className="card service-docs p-4 md:p-5 space-y-4">
      <p className="text-sm md:text-base opacity-80">
        Здесь собраны ответы о выборе систем и зон, форматах координат, точности,
        импорте и выгрузке Excel. Подробные пояснения доступны по ссылкам в ответах.
      </p>

      <div className="space-y-2 md:space-y-3">
        {faqs.map((item, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={item.question}
              className="faq-item rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/60"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${idx}`}
                className="w-full flex items-center justify-between gap-3 px-3 md:px-4 py-2.5 md:py-3 text-left"
                onClick={() => toggleIndex(idx)}
              >
                <span className="text-sm md:text-base font-medium">
                  {item.question}
                </span>
                <span className="shrink-0 text-slate-500 dark:text-slate-400">
                  <IconChevron open={isOpen} />
                </span>
              </button>

              {/* Answers grow naturally so long text remains readable on mobile. */}
              <div
                id={`faq-answer-${idx}`}
                className={
                  "px-3 md:px-4 border-t border-slate-200/70 dark:border-slate-700/70 " +
                  (isOpen ? "block" : "hidden")
                }
              >
                <div className="pt-1 md:pt-2 pb-3 md:pb-4 text-sm md:text-[15px] leading-relaxed opacity-80">
                  {item.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
