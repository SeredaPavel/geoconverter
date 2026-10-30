export default function UtmReferenceExample({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-3">
      <p>Выберите исходную систему «WGS-84 (географические)», целевую — «UTM (WGS-84)».
        Введите широту и долготу в десятичных градусах, задайте зону и полушарие, затем нажмите «Пересчитать».</p>
      <div className="guide-table-wrap">
        <table className="guide-table">
          <caption className="sr-only">Контрольные примеры перевода WGS84 в UTM</caption>
          <thead><tr><th scope="col">Вход и настройки</th><th scope="col">Ожидаемый результат</th></tr></thead>
          <tbody>
            <tr><td>Широта 56°, долгота 12°<br />Зона 32, северное полушарие</td><td>X ≈ 687071,44 м<br />Y ≈ 6210141,33 м</td></tr>
            {!compact && <tr><td>Широта −44°, долгота 174°<br />Зона 59, южное полушарие</td><td>X ≈ 740526,32 м<br />Y ≈ 5123750,87 м</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-sm opacity-80">Результаты при округлении до 0,01 м сопоставлены с опубликованными примерами{" "}
        <a href="https://proj.org/en/stable/operations/projections/utm.html">документации PROJ</a>.
        Это проверка проекции UTM, а не оценка точности переходов между разными геодезическими основами.</p>
    </div>
  );
}
