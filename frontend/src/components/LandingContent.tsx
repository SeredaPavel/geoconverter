import Link from "next/link";

const systems = ["WGS84", "СК-42", "СК-95", "ГСК-2011", "ПЗ-90", "МСК"];

const steps = [
  { title: "Выберите системы", text: "Укажите исходную и целевую системы координат. Для зональных систем выберите нужную зону." },
  { title: "Введите координаты", text: "Добавьте точки вручную или импортируйте таблицу Excel с широтой и долготой либо X и Y." },
  { title: "Выполните пересчёт", text: "Получите результат и при необходимости выгрузите каталог координат или ведомость в Excel." },
];

function StepIcon({ step }: { step: number }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {step === 1 && <><path d="m5 16 19-10 19 10-19 10L5 16Z" /><path d="m5 24 19 10 19-10M5 32l19 10 19-10" /></>}
      {step === 2 && <><path d="M13 5h16l8 8v30H13V5Z" /><path d="M29 5v10h8M19 23h12M19 30h12M19 37h7" /></>}
      {step === 3 && <><path d="M41 20A18 18 0 0 0 9 12l-4 5M5 7v10h10M7 28a18 18 0 0 0 32 8l4-5M43 41V31H33" /></>}
    </svg>
  );
}

export default function LandingContent() {
  return (
    <div className="landing-content">
      <section className="card landing-section" aria-labelledby="supported-title">
        <h2 id="supported-title">Поддерживаемые системы</h2>
        <ul className="landing-systems" aria-label="Основные системы координат">
          {systems.map(system => <li key={system}>{system}</li>)}
        </ul>
        <p className="landing-note">Также доступны проекции Гаусса–Крюгера, UTM и СК-63. Доступность зависит от выбранной системы и зоны.</p>
        <Link className="guide-link text-sm" href="/features#systems">Подробнее о системах и настройках</Link>
      </section>

      <section className="card landing-section" aria-labelledby="how-to-title">
        <h2 id="how-to-title">Как пользоваться</h2>
        <ol className="landing-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className="landing-step-top"><span className="landing-step-number">{index + 1}</span><StepIcon step={index + 1} /></div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card landing-section" aria-labelledby="limits-title">
        <h2 id="limits-title">Ограничения</h2>
        <div className="landing-limits">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m24 5 21 36H3L24 5Z" /><path d="M24 17v10M24 33v1" /></svg>
          <div>
            <p>Проверьте систему, зону и единицы измерения. В этом сервисе X — восток, Y — север. Для UTM также важно выбрать полушарие.</p>
            <p className="landing-note">Точность зависит от исходных данных и параметров преобразования. Приближённый вариант МГГТ отмечен отдельно; неподтверждённые системы недоступны. Excel: две колонки, файл до 1 МБ, импорт первых 100 строк данных.</p>
            <Link className="guide-link text-sm" href="/features#accuracy">Методика и ограничения точности</Link>
          </div>
        </div>
      </section>

      <section className="card landing-section" aria-labelledby="questions-title">
        <h2 id="questions-title">Частые вопросы</h2>
        <div className="landing-faq">
          <details className="faq-item" open>
            <summary>Нужна ли установка?</summary>
            <p>Нет, сервис работает в браузере. Устанавливать программу и регистрироваться не нужно.</p>
          </details>
          <details className="faq-item" open>
            <summary>Как начать?</summary>
            <p>Нажмите «Запуск конвертера», выберите исходную и целевую системы и введите координаты. Углы можно задавать в десятичных градусах, градусах и минутах или градусах, минутах и секундах.</p>
          </details>
        </div>
      </section>
    </div>
  );
}
