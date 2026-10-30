import Link from "next/link";
import UtmReferenceExample from "./UtmReferenceExample";

export default function ConverterGuide() {
  return (
    <section className="card service-docs p-4 md:p-5 mt-5 space-y-4" aria-labelledby="converter-guide-title">
      <h2 id="converter-guide-title" className="text-lg font-semibold">Как выполнить пересчёт</h2>
      <ol className="list-decimal pl-5 space-y-2">
        <li>Выберите исходную и целевую системы. Для МСК и СК-63 уточните вариант и зону; для UTM — номер зоны и полушарие.</li>
        <li>Введите широту и долготу либо X и Y вручную или выберите загрузку Excel. В этом интерфейсе X — восток, Y — север.</li>
        <li>Нажмите «Пересчитать». Для обратного направления используйте «Реверс». В меню выгрузки выберите каталог результатов или ведомость с исходными и полученными координатами.</li>
      </ol>
      <p className="text-sm opacity-80">Чтобы изменить только запись углов, оставьте одинаковую исходную и целевую систему, выбрав разные форматы ввода и результата.</p>
      <details className="guide-disclosure">
        <summary>Проверить работу на примере UTM</summary>
        <div className="pt-3"><UtmReferenceExample compact /></div>
      </details>
      <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Помощь по пересчёту">
        <Link href="/features#systems">Системы и зоны</Link>
        <Link href="/features#excel">Подготовка Excel и шаблоны</Link>
        <Link href="/features#accuracy">Методика и точность</Link>
        <Link href="/faq">Ответы на вопросы</Link>
      </nav>
    </section>
  );
}
