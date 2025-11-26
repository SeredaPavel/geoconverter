// /geoconverter/frontend/src/components/ConverterPanel.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Point = { lat?: number; lon?: number; x?: number; y?: number };
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

/* Иконки */
const IconUpload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12V8l-4-6z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 20V10m0 0l-4 4m4-4l4 4M4 4h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle
      cx="11"
      cy="11"
      r="6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16 16l3.5 3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/* helpers */
const placeholders = {
  deg_dec: { lat: "00.000000°", lon: "00.000000°" },
  deg_min: { lat: "00°00.00′", lon: "00°00.00′" },
  deg_min_sec: { lat: "00°00′00.00″", lon: "00°00′00.00″" },
} as const;

const isRowEmpty = (r: Point) =>
  (r.lat === undefined || r.lat === null || Number.isNaN(r.lat as any)) &&
  (r.lon === undefined || r.lon === null || Number.isNaN(r.lon as any));

export default function ConverterPanel() {
  // CRS
  const [crsFrom, setCrsFrom] = useState("EPSG:4326");
  const [crsTo, setCrsTo] = useState("EPSG:4326");

  // независимые форматы
  const [formatIn, setFormatIn] =
    useState<"deg_dec" | "deg_min" | "deg_min_sec">("deg_dec");
  const [formatOut, setFormatOut] =
    useState<"deg_dec" | "deg_min" | "deg_min_sec">("deg_dec");

  // данные
  const [rowsIn, setRowsIn] = useState<Point[]>([
    { lat: undefined, lon: undefined },
  ]);
  const [rowsOut, setRowsOut] = useState<Point[]>([
    { lat: undefined, lon: undefined },
  ]);

  // опции
  const [zoneMode, setZoneMode] = useState<3 | 6>(6);
  const [autoZone, setAutoZone] = useState(true);
  const [loading, setLoading] = useState(false);

  // UI
  const [preview, setPreview] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // выпадашки (импорт/экспорт)
  const [openImport, setOpenImport] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const importRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // кастомные выпадашки CRS
  const [openCrsFromMenu, setOpenCrsFromMenu] = useState(false);
  const [openCrsToMenu, setOpenCrsToMenu] = useState(false);
  const crsFromRef = useRef<HTMLDivElement | null>(null);
  const crsToRef = useRef<HTMLDivElement | null>(null);

  // поиск по СК
  const [crsSearch, setCrsSearch] = useState("");

  const crsOptions = useMemo(
    () => [
      { code: "EPSG:4326", title: "WGS 84 (готово)" },
      { code: "GSK2011_GEOG", title: "ГСК-2011 (в разработке)" },
      { code: "SK42_GEOG", title: "СК-42 (в разработке)" },
      { code: "SK95_GEOG", title: "СК-95 (в разработке)" },
      { code: "PZ90_GEOG", title: "ПЗ-90 (в разработке)" },
      { code: "MSK:DNR", title: "МСК ДНР (в разработке)" },
      { code: "MSK:LNR", title: "МСК ЛНР (в разработке)" },
      { code: "MSK:KHER", title: "МСК Херсонская обл. (в разработке)" },
      { code: "MSK:ZAPR", title: "МСК Запорожская обл. (в разработке)" },
    ],
    [],
  );

  const filteredCrs = useMemo(() => {
    const q = crsSearch.trim().toLowerCase();
    if (!q) return crsOptions;
    return crsOptions.filter(
      (o) =>
        o.title.toLowerCase().includes(q) || o.code.toLowerCase().includes(q),
    );
  }, [crsOptions, crsSearch]);

  const addRow = () => setRowsIn((r) => [...r, {}]);
  const removeRow = () =>
    setRowsIn((r) =>
      r.length > 1 ? r.slice(0, -1) : [{ lat: undefined, lon: undefined }],
    );
  const reverse = () => {
    setCrsFrom(crsTo);
    setCrsTo(crsFrom);
  };

  // клик-вне и ESC — закрыть меню
  useEffect(() => {
    const onDocDown = (e: PointerEvent | MouseEvent) => {
      const t = e.target as Node;
      if (
        !importRef.current?.contains(t) &&
        !exportRef.current?.contains(t) &&
        !crsFromRef.current?.contains(t) &&
        !crsToRef.current?.contains(t)
      ) {
        setOpenImport(false);
        setOpenExport(false);
        setOpenCrsFromMenu(false);
        setOpenCrsToMenu(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenImport(false);
        setOpenExport(false);
        setOpenCrsFromMenu(false);
        setOpenCrsToMenu(false);
      }
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // локальное «готово»
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(false), 3500);
    return () => clearTimeout(t);
  }, [ok]);

  const recalc = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crs_from: crsFrom,
          crs_to: crsTo,
          format_in: formatIn,
          format_out: formatOut,
          points: rowsIn,
          options: { auto_zone: autoZone, zone_mode: zoneMode },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка пересчёта");
      setRowsOut(
        data.points && data.points.length > 0
          ? data.points
          : [{ lat: undefined, lon: undefined }],
      );
      setOk(true);
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const canUploadHint =
    "• Только Excel ≤ 1 МБ\n• Ровно ДВЕ колонки: Lat/Lon ИЛИ X/Y";
  const onImport = async (f: File) => {
    if (f.size > 1_000_000) {
      setToast("Файл больше 1 МБ");
      return;
    }
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch(`${API_BASE}/import`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.detail || "Ошибка импорта");
      return;
    }
    setPreview(data.rows_preview || []);
    setToast(`Прочитано строк: ${data.rows_total}. Предпросмотр внизу.`);
  };

  const exportFile = async (kind: "catalog" | "statement") => {
    try {
      const res = await fetch(`${API_BASE}/export/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crs_from: crsFrom,
          crs_to: crsTo,
          format: formatOut,
          format_in: formatIn,
          format_out: formatOut,
          rows_in: rowsIn,
          rows_out: rowsOut,
        }),
      });
      if (!res.ok) throw new Error("Экспорт недоступен");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "catalog" ? "catalog.xlsx" : "statement.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setToast(e.message || "Ошибка экспорта");
    }
  };

  const getCrsTitle = (code: string) =>
    crsOptions.find((o) => o.code === code)?.title || code;

  const renderCrsMenu = (
    which: "from" | "to",
    current: string,
    onSelect: (code: string) => void,
  ) => (
    <div className="absolute top-full left-0 mt-2 z-[1001] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-soft">
      {/* Поиск */}
      <div className="px-2 pt-2 pb-1 border-b border-slate-200/70 dark:border-slate-700/70">
        <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">
          Поиск
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70">
            <IconSearch />
          </span>
          <input
            type="text"
            className="input h-8 w-full pl-3 pr-7 text-xs"
            placeholder="Название или код СК"
            value={crsSearch}
            onChange={(e) => setCrsSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Список СК — высота на ~3 строки */}
      <div className="max-h-28 overflow-y-auto py-1">
        {filteredCrs.length === 0 && (
          <div className="px-3 py-2 text-xs opacity-60">
            Ничего не найдено
          </div>
        )}
        {filteredCrs.map((o) => (
          <button
            key={o.code}
            type="button"
            className={
              "w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 " +
              (o.code === current ? "bg-slate-100 dark:bg-slate-800" : "")
            }
            onClick={() => {
              onSelect(o.code);
              setOpenCrsFromMenu(false);
              setOpenCrsToMenu(false);
            }}
          >
            {o.title}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 md:gap-6">
      {/* 1) Верхняя полоска опций */}
      <section className="card card-overflow-visible relative z-20 p-4 md:p-5 grid gap-3 md:grid-cols-5 md:items-end">
        {/* Авто-зона ГК */}
        <div className="space-y-1 min-w-0">
          <label className="text-xs opacity-70">Авто-зона ГК</label>
          <div className="flex items-center gap-2 h-10">
            <input
              id="autoZone"
              type="checkbox"
              checked={autoZone}
              onChange={(e) => setAutoZone(e.target.checked)}
            />
            <label htmlFor="autoZone" className="text-sm">
              вкл.
            </label>
          </div>
        </div>

        {/* Ширина зоны */}
        <div className="space-y-1 min-w-0">
          <label className="text-xs opacity-70">Ширина зоны</label>
          <div className="relative">
            <select
              className="select w-full h-10 pr-8 appearance-none"
              value={zoneMode}
              onChange={(e) => setZoneMode(Number(e.target.value) as 3 | 6)}
            >
              <option value={6}>6°</option>
              <option value={3}>3°</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70">
              <IconChevronDown />
            </span>
          </div>
        </div>

        {/* Выгрузка */}
        <div className="space-y-1 min-w-0" ref={exportRef}>
          <label className="text-xs opacity-70">Выгрузить координаты</label>
          <div className="relative">
            <button
              className="btn w-full h-10 justify-between md:text-base text-sm md:px-4 px-3"
              onClick={() => {
                setOpenExport((v) => !v);
                setOpenImport(false);
              }}
              type="button"
            >
              <span className="inline-flex items-center gap-2 min-w-0 flex-1">
                <span className="shrink-0">
                  <IconDownload />
                </span>
                <span className="truncate">Выбрать формат</span>
              </span>
              <span className="shrink-0">
                <IconChevronDown />
              </span>
            </button>

            {openExport && (
              <div className="absolute top-full right-0 mt-2 z-[1002] min-w-56 max-w-[min(260px,calc(100vw-2rem))] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft p-2">
                <button
                  className="btn w-full justify-start text-sm md:text-base"
                  onClick={() => {
                    exportFile("statement");
                    setOpenExport(false);
                  }}
                  type="button"
                >
                  <IconDownload /> Ведомость
                </button>
                <button
                  className="btn w-full justify-start text-sm md:text-base"
                  onClick={() => {
                    exportFile("catalog");
                    setOpenExport(false);
                  }}
                  type="button"
                >
                  <IconDownload /> Каталог
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Загрузка */}
        <div className="space-y-1 min-w-0" ref={importRef}>
          <label className="text-xs opacity-70">Загрузить координаты</label>
          <div className="relative">
            <button
              className="btn w-full h-10 justify-between md:text-base text-sm md:px-4 px-3"
              onClick={() => {
                setOpenImport((v) => !v);
                setOpenExport(false);
              }}
              type="button"
            >
              <span className="inline-flex items-center gap-2 min-w-0 flex-1">
                <span className="shrink-0">
                  <IconUpload />
                </span>
                <span className="truncate">Выбрать формат</span>
              </span>
              <span className="shrink-0">
                <IconChevronDown />
              </span>
            </button>

            {openImport && (
              <div className="absolute top-full right-0 mt-2 z-[1002] min-w-56 max-w-[min(260px,calc(100vw-2rem))] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft p-2">
                <label className="btn w-full justify-start text-sm md:text-base">
                  <input
                    hidden
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onImport(f);
                      e.currentTarget.value = "";
                      setOpenImport(false);
                    }}
                  />
                  <IconUpload /> Загрузить Excel
                </label>
                <a
                  className="btn w-full justify-start text-sm md:text-base"
                  href="/templates/template_latlon.xlsx"
                >
                  <IconFile /> Шаблон Lat/Lon
                </a>
                <a
                  className="btn w-full justify-start text-sm md:text-base"
                  href="/templates/template_xy.xlsx"
                >
                  <IconFile /> Шаблон X/Y
                </a>
                <div
                  className="dropzone"
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) onImport(f);
                    setOpenImport(false);
                  }}
                >
                  Перетащите Excel сюда
                  <br />
                  {canUploadHint}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Реверс */}
        <div className="space-y-1 min-w-0">
          <label className="text-xs opacity-0 select-none">Реверс</label>
          <button className="btn w-full h-10" onClick={reverse} type="button">
            Реверс
          </button>
        </div>
      </section>

      {/* 2–3) Средние секции */}
      <div className="grid md:grid-cols-2 gap-5 md:gap-6">
        {/* Исходные данные */}
        <section className="card card-overflow-visible p-4 md:p-5 space-y-4 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-400/50">
          <div className="text-lg font-semibold">Исходные данные</div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs opacity-70">Исходная СК</label>

              <div className="relative" ref={crsFromRef}>
                <button
                  type="button"
                  className="select w-full h-10 pr-8 flex items-center justify-between text-left"
                  onClick={() => {
                    setOpenCrsFromMenu((v) => !v);
                    setOpenCrsToMenu(false);
                    setCrsSearch("");
                  }}
                >
                  <span className="truncate">{getCrsTitle(crsFrom)}</span>
                  <span className="ml-2 shrink-0 pointer-events-none opacity-70">
                    <IconChevronDown />
                  </span>
                </button>

                {openCrsFromMenu &&
                  renderCrsMenu("from", crsFrom, (code) => setCrsFrom(code))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs opacity-70">Формат</label>
              <div className="segment md:ml-0 ml-2">
                {[
                  { k: "deg_dec", t: "гг.ггг°" },
                  { k: "deg_min", t: "гг°мм.мм′" },
                  { k: "deg_min_sec", t: "гг°мм′сс″" },
                ].map((s) => (
                  <button
                    key={s.k}
                    onClick={() => setFormatIn(s.k as any)}
                    className={s.k === formatIn ? "active" : ""}
                    type="button"
                  >
                    {s.t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Таблица ввода */}
          <div className="table-wrap">
            <table className="min-w-full table-fixed text-sm table-xs">
              <colgroup>
                <col className="w-10 md:w-12" />
                <col className="w-[45%] md:w-48" />
                <col className="w-[45%] md:w-48" />
                <col className="w-0 md:w-0" />
              </colgroup>
              <thead>
                <tr className="text-left">
                  <th className="p-2">№</th>
                  <th className="p-2">Широта (lat)</th>
                  <th className="p-2">Долгота (lon)</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rowsIn.map((r, i) => {
                  return (
                    <tr
                      key={i}
                      className="border-t border-slate-200/60 dark:border-slate-700/60"
                    >
                      <td className="p-2">{i + 1}</td>
                      <td className="pr-1 md:p-2">
                        <input
                          className="input w-full"
                          type="text"
                          inputMode="decimal"
                          placeholder={placeholders[formatIn].lat}
                          value={r.lat ?? ""}
                          onChange={(e) => {
                            const v =
                              e.target.value === ""
                                ? undefined
                                : Number(
                                    e.target.value.replace(",", "."),
                                  );
                            setRowsIn(
                              rowsIn.map((rr, idx) =>
                                idx === i ? { ...rr, lat: v } : rr,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="pl-1 md:p-2">
                        <input
                          className="input w-full"
                          type="text"
                          inputMode="decimal"
                          placeholder={placeholders[formatIn].lon}
                          value={r.lon ?? ""}
                          onChange={(e) => {
                            const v =
                              e.target.value === ""
                                ? undefined
                                : Number(
                                    e.target.value.replace(",", "."),
                                  );
                            setRowsIn(
                              rowsIn.map((rr, idx) =>
                                idx === i ? { ...rr, lon: v } : rr,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="p-2">{/* пустая колонка */}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn h-10 px-4" onClick={addRow} type="button">
              Добавить точку
            </button>
            <button
              className="btn h-10 px-4"
              onClick={removeRow}
              disabled={rowsIn.length === 1 && isRowEmpty(rowsIn[0])}
              title={
                rowsIn.length === 1
                  ? "Очистить строку"
                  : "Удалить последнюю строку"
              }
              type="button"
            >
              Удалить точку
            </button>
          </div>
        </section>

        {/* Результат */}
        <section className="card card-overflow-visible p-4 md:p-5 space-y-4 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-400/50">
          <div className="text-lg font-semibold">Результат</div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs opacity-70">Целевая СК</label>

              <div className="relative" ref={crsToRef}>
                <button
                  type="button"
                  className="select w-full h-10 pr-8 flex items-center justify-between text-left"
                  onClick={() => {
                    setOpenCrsToMenu((v) => !v);
                    setOpenCrsFromMenu(false);
                    setCrsSearch("");
                  }}
                >
                  <span className="truncate">{getCrsTitle(crsTo)}</span>
                  <span className="ml-2 shrink-0 pointer-events-none opacity-70">
                    <IconChevronDown />
                  </span>
                </button>

                {openCrsToMenu &&
                  renderCrsMenu("to", crsTo, (code) => setCrsTo(code))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs opacity-70">Формат</label>
              <div className="segment md:ml-0 ml-2">
                {[
                  { k: "deg_dec", t: "гг.ггг°" },
                  { k: "deg_min", t: "гг°мм.мм′" },
                  { k: "deg_min_sec", t: "гг°мм′сс″" },
                ].map((s) => (
                  <button
                    key={s.k}
                    onClick={() => setFormatOut(s.k as any)}
                    className={s.k === formatOut ? "active" : ""}
                    type="button"
                  >
                    {s.t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Таблица результата */}
          <div className="table-wrap">
            <table className="min-w-full table-fixed text-sm table-xs">
              <colgroup>
                <col className="w-10 md:w-12" />
                <col className="w-[45%] md:w-48" />
                <col className="w-[45%] md:w-48" />
              </colgroup>
              <thead>
                <tr className="text-left">
                  <th className="p-2">№</th>
                  <th className="p-2">Широта</th>
                  <th className="p-2">Долгота</th>
                </tr>
              </thead>
              <tbody>
                {rowsOut.map((r, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-200/60 dark:border-slate-700/60"
                  >
                    <td className="p-2">{i + 1}</td>
                    <td className="pr-1 md:p-2">
                      <input
                        className="input w-full text-center"
                        value={(r.lat ?? r.y ?? "-") as any}
                        readOnly
                      />
                    </td>
                    <td className="pl-1 md:p-2">
                      <input
                        className="input w-full text-center"
                        value={(r.lon ?? r.x ?? "-") as any}
                        readOnly
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary h-10 px-4"
              onClick={recalc}
              disabled={loading}
              type="button"
            >
              {loading ? "Пересчитываю..." : "Пересчитать"}
            </button>
            {ok && (
              <div className="card px-3 py-2 text-sm">
                Готово: координаты пересчитаны
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Предпросмотр Excel */}
      {preview.length > 0 && (
        <section className="card p-3">
          <div className="font-medium mb-2">
            Предпросмотр Excel (первые строки):
          </div>
          <pre className="text-xs overflow-auto max-h-48">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>
      )}

      {/* Ошибки — тост */}
      {toast && (
        <div className="fixed right-4 bottom-4 z-[1000] pointer-events-none">
          <div className="card px-4 py-3">{toast}</div>
        </div>
      )}
    </div>
  );
}
