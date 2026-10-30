// /geoconverter/frontend/src/components/ConverterPanel.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Point, AngleFormat, formatAngle, numericPoints, reformatPoints, excelPoints } from "@/lib/coordinates";

import GkSettingsPanel from "@/components/GkSettings";
import CrsInfo from "@/components/CrsInfo";
import { defaultGkSettings, gkRequest, GkZones } from "@/lib/gk";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
const TOAST_DURATION_MS = 7000;

type Toast = { message: string; tone: "error" | "info" };

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
  [r.lat, r.lon, r.x, r.y].every(
    (v) => v === undefined || v === null || Number.isNaN(v as any),
  );

type CrsOption = {
  code: string;
  title: string;
  group: string;
  category: string; // 'geographic' | 'projected' | 'msk' | ...
  status: string;
  description?: string;
  gk_zones?: GkZones;
};

export default function ConverterPanel() {
  // CRS
  const [crsFrom, setCrsFrom] = useState("EPSG:4326");
  const [crsTo, setCrsTo] = useState("EPSG:4326");

  // форматы
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
  const [rowsExpanded, setRowsExpanded] = useState(false);
  const visibleRowsIn = rowsExpanded ? rowsIn : rowsIn.slice(0, 5);
  const visibleRowsOut = rowsExpanded ? rowsOut : rowsOut.slice(0, 5);
  const canExpandRows = rowsIn.length > 5 || rowsOut.length > 5;

  // опции
  const [sourceGk, setSourceGk] = useState(defaultGkSettings);
  const [targetGk, setTargetGk] = useState(defaultGkSettings);
  const [calculationNotes, setCalculationNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // UI
  const [preview, setPreview] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = (message: string, tone: Toast["tone"] = "error") =>
    setToast({ message, tone });
  const [ok, setOk] = useState(false);

  // CRS-опции
  const [crsOptions, setCrsOptions] = useState<CrsOption[]>([]);

  // выпадашки
  const [openImport, setOpenImport] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const importRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [openCrsFromMenu, setOpenCrsFromMenu] = useState(false);
  const [openCrsToMenu, setOpenCrsToMenu] = useState(false);
  const crsFromRef = useRef<HTMLDivElement | null>(null);
  const crsToRef = useRef<HTMLDivElement | null>(null);

  const [crsSearch, setCrsSearch] = useState("");

  // загрузка СК
  useEffect(() => {
    const fetchCrs = async () => {
      try {
        const res = await fetch(`${API_BASE}/crs`);
        if (!res.ok) throw new Error("Не удалось загрузить список систем координат");
        const data = await res.json();

        const mapCategoryToGroup = (cat: string): string => {
          switch (cat) {
            case "geographic":
              return "Геодезические СК";
            case "projected":
              return "Проекция Гаусса-Крюгера";
            case "msk":
              return "МСК";
            case "sk63":
              return "СК-63";
            default:
              return "Прочие";
          }
        };

        const mapped: CrsOption[] = (data as any[]).map((item) => {
          const baseTitle = item.title as string;
          const status = item.status as string | undefined;
          const suffix =
            status === "dev"
              ? " (в разработке)"
              : "";
          return {
            code: item.code as string,
            group: mapCategoryToGroup(item.category as string),
            title: baseTitle + suffix,
            category: (item.category as string) || "other",
            status: status || "ready",
            description: item.description || undefined,
            gk_zones: item.gk_zones || undefined,
          };
        });

        setCrsOptions(mapped);
      } catch (e: any) {
        showToast(e.message || "Ошибка загрузки списка СК");
      }
    };

    fetchCrs();
  }, []);

  const filteredCrs = useMemo(() => {
    const q = crsSearch.trim().toLowerCase();
    if (!q) return crsOptions;
    return crsOptions.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        o.group.toLowerCase().includes(q),
    );
  }, [crsOptions, crsSearch]);

  const addRow = () => setRowsIn((r) => [...r, {}]);
  const removeRow = () =>
    setRowsIn((r) =>
      r.length > 1 ? r.slice(0, -1) : [{ lat: undefined, lon: undefined }],
    );

  const reverse = () => {
    try {
      setToast(null);
      const source = numericPoints(rowsIn);
      const result = numericPoints(rowsOut);
      setCrsFrom(crsTo);
      setCrsTo(crsFrom);
      setSourceGk(targetGk);
      setTargetGk(sourceGk);
      setCalculationNotes([]);
      setRowsIn(reformatPoints(result, formatOut));
      setRowsOut(source);
      setFormatIn(formatOut);
      setFormatOut(formatIn);
    } catch (error) {
      showToast((error as Error).message);
    }
  };

  const changeInputFormat = (format: AngleFormat) => {
    try {
      setToast(null);
      setRowsIn(reformatPoints(rowsIn, format));
      setFormatIn(format);
    } catch (error) {
      showToast((error as Error).message);
    }
  };

  // клик-вне и ESC
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

  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(false), 3500);
    return () => clearTimeout(t);
  }, [ok]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const recalc = async () => {
    setLoading(true);
    setToast(null);
    try {
      setCalculationNotes([]);
      const options = {
        source_gk: crsFrom.startsWith("GK_") ? gkRequest(sourceGk, crsOptions.find(o => o.code === crsFrom)?.gk_zones) : undefined,
        target_gk: crsTo.startsWith("GK_") ? gkRequest(targetGk, crsOptions.find(o => o.code === crsTo)?.gk_zones) : undefined,
      };
      const res = await fetch(`${API_BASE}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crs_from: crsFrom,
          crs_to: crsTo,
          format_in: formatIn,
          format_out: formatOut,
          points: numericPoints(rowsIn),
          options,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.detail)
        ? data.detail.map((item: { msg: string }) => item.msg).join("; ")
        : data.detail || "Ошибка пересчёта");
      setRowsOut(
        data.points && data.points.length > 0
          ? data.points
          : [{ lat: undefined, lon: undefined }],
      );
      setCalculationNotes(data.meta?.assumptions || []);
      setOk(true);
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const canUploadHint =
    "• Только Excel ≤ 1 МБ\n• Импортируются первые 100 строк данных\n• Ровно ДВЕ колонки: Lat/Lon ИЛИ X/Y";

  const onImport = async (f: File) => {
  if (f.size > 1_000_000) {
    showToast("Файл больше 1 МБ");
    return;
  }

  const fd = new FormData();
  fd.append("file", f);

  try {
    const res = await fetch(`${API_BASE}/import`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.detail || "Ошибка импорта");
      return;
    }

    // 1. Backend возвращает до 100 строк для таблицы и пересчёта.
    const previewRows = Array.isArray(data.rows_preview)
      ? data.rows_preview
      : [];

    if (previewRows.length === 0) {
      showToast("Файл прочитан, но данных не найдено");
      return;
    }

    // 2. Проверяем число колонок
    const first = previewRows[0] || {};
    const keys = Array.isArray(data.columns) ? data.columns : Object.keys(first);
    if (keys.length !== 2) {
      showToast("В Excel должно быть ровно 2 колонки");
      return;
    }

    // 3. Определяем, геодезическая ли исходная СК
    const src = crsOptions.find((c) => c.code === crsFrom);
    const sourceIsGeodetic = src?.group === "Геодезические СК";

    // 4. Подписанные колонки уже упорядочены backend: lat/lon или X/Y.
    const newRows = excelPoints(previewRows, keys, !sourceIsGeodetic, formatIn);

    if (newRows.length === 0) {
      showToast("Не удалось получить корректные координаты из файла");
      return;
    }

    // 5. Вариант А: Excel полностью заменяет таблицу
    setRowsIn(newRows);
    setRowsExpanded(false);
    // Сбрасываем результат
    setRowsOut([{ lat: undefined, lon: undefined }]);

    const summary = data.rows_total > newRows.length
      ? `Загружено ${newRows.length} из ${data.rows_total} строк. Лимит импорта — ${data.rows_limit} строк. Остальные строки не загружены; разделите файл на части.`
      : `Загружено строк: ${newRows.length}.`;
    setPreview(previewRows);
    setImportSummary(summary);
    showToast(summary, "info");
  } catch (e: any) {
    console.error(e);
    showToast(e?.message || "Ошибка импорта");
  }
};


  const exportFile = async (kind: "catalog" | "statement") => {
    try {
      setToast(null);
      const res = await fetch(`${API_BASE}/export/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crs_from: crsFrom,
          crs_to: crsTo,
          format: formatOut,
          format_in: formatIn,
          format_out: formatOut,
          rows_in: numericPoints(rowsIn),
          rows_out: numericPoints(rowsOut),
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
      showToast(e.message || "Ошибка экспорта");
    }
  };

  const getCrsTitle = (code: string) =>
    crsOptions.find((o) => o.code === code)?.title || code;

  const getCrsLabel = (code: string, maxLen = 30) => {
    const full = getCrsTitle(code);
    if (full.length <= maxLen) return full;
    return full.slice(0, maxLen) + "…";
  };

  const renderCrsMenu = (
    which: "from" | "to",
    current: string,
    onSelect: (code: string) => void,
  ) => (
    <div className="theme-menu absolute top-full left-0 mt-2 z-[1001] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-soft">
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

      {/* Список СК */}
      <div className="max-h-72 overflow-y-auto py-1">
        {filteredCrs.length === 0 && (
          <div className="px-3 py-2 text-xs opacity-60">
            Ничего не найдено
          </div>
        )}

        {filteredCrs.length > 0 && (
          <>
            {(() => {
              let lastGroup = "";
              return filteredCrs.map((o) => {
                const showGroupHeader = o.group !== lastGroup;
                lastGroup = o.group;
                return (
                  <div key={o.code}>
                    {showGroupHeader && (
                      <div className="h-6 flex items-center px-3 text-[10px] uppercase tracking-wide opacity-60">
                        {o.group}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={o.status === "dev"}
                      aria-pressed={o.code === current}
                      title={o.description}
                      className={
                        "w-full h-16 flex items-center text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed " +
                        (o.code === current
                          ? "bg-slate-100 dark:bg-slate-800"
                          : "")
                      }
                      onClick={() => {
                        onSelect(o.code);
                        setOpenCrsFromMenu(false);
                        setOpenCrsToMenu(false);
                      }}
                    >
                      <span className="line-clamp-2">{o.title}</span>
                    </button>
                  </div>
                );
              });
            })()}
          </>
        )}
      </div>
    </div>
  );

  // целевая СК плоская?
  const isResultProjected = useMemo(() => {
    const item = crsOptions.find((o) => o.code === crsTo);
    if (!item) return false;
    return item.category !== "geographic";
  }, [crsOptions, crsTo]);

  // исходная СК плоская?
  const isSourceProjected = useMemo(() => {
    const item = crsOptions.find((o) => o.code === crsFrom);
    if (!item) return false;
    return item.category !== "geographic";
  }, [crsOptions, crsFrom]);

  const usesGk = crsFrom.startsWith("GK_") || crsTo.startsWith("GK_");
  const sourceCrs = crsOptions.find(o => o.code === crsFrom);
  const targetCrs = crsOptions.find(o => o.code === crsTo);
  const showCrsInfo = [sourceCrs, targetCrs].some(crs => crs && ["sk63", "msk"].includes(crs.category));

  return (
    <div className="grid gap-5 md:gap-6">
      {/* 1) Верхняя полоска */}
      <section className="card card-overflow-visible relative z-20 p-4 md:p-5 grid gap-3 md:grid-cols-3 md:items-end">
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
              <div className="theme-menu absolute top-full right-0 mt-2 z-[1002] min-w-56 max-w-[min(260px,calc(100vw-2rem))] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft p-2">
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
              <div className="theme-menu absolute top-full right-0 mt-2 z-[1002] min-w-56 max-w-[min(260px,calc(100vw-2rem))] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft p-2">
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

      {usesGk && (
        <section className="card p-4 md:p-5 grid md:grid-cols-2 gap-5 md:gap-6" aria-label="Настройки зон Гаусса–Крюгера">
          <GkSettingsPanel side="source" value={sourceGk} onChange={setSourceGk}
            zones={crsOptions.find(o => o.code === crsFrom)?.gk_zones} />
          <GkSettingsPanel side="target" value={targetGk} onChange={setTargetGk}
            zones={crsOptions.find(o => o.code === crsTo)?.gk_zones} />
        </section>
      )}
      {calculationNotes.length > 0 && (
        <aside className="card p-4 text-sm" role="status">
          {calculationNotes.map(note => <p key={note}>{note}</p>)}
        </aside>
      )}

      {/* 2–3) Блоки */}
      <div className="grid md:grid-cols-2 gap-5 md:gap-6">
        {/* Исходные данные */}
        <section className="coordinate-card card card-overflow-visible p-4 md:p-5 flex flex-col gap-4 min-w-0 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-400/50">
          <div className="text-lg font-semibold">Исходные данные</div>
          {showCrsInfo && <CrsInfo key={crsFrom} crs={sourceCrs} />}

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
                  <span className="truncate">
                    {getCrsLabel(crsFrom, 30)}
                  </span>
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
                    onClick={() => changeInputFormat(s.k as AngleFormat)}
                    className={s.k === formatIn ? "active" : ""}
                    type="button"
                    disabled={isSourceProjected} // для плоских СК формат углов не критичен
                  >
                    {s.t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Таблица ввода */}
          <div className="table-wrap">
            <table id="input-coordinate-table" className="min-w-full table-fixed text-sm table-xs">
              <colgroup>
                <col className="w-10 md:w-12" />
                <col className="w-[45%] md:w-48" />
                <col className="w-[45%] md:w-48" />
                <col className="w-0 md:w-0" />
              </colgroup>
              <thead>
                <tr className="text-left">
                  <th className="p-2">№</th>
                  <th className="p-2">
                    {isSourceProjected ? "X — восток (м)" : "Широта (lat)"}
                  </th>
                  <th className="p-2">
                    {isSourceProjected ? "Y — север (м)" : "Долгота (lon)"}
                  </th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {visibleRowsIn.map((r, i) => {
                  const val1 = isSourceProjected ? r.x ?? "" : r.lat ?? "";
                  const val2 = isSourceProjected ? r.y ?? "" : r.lon ?? "";
                  const ph1 = isSourceProjected
                    ? "X, м"
                    : placeholders[formatIn].lat;
                  const ph2 = isSourceProjected
                    ? "Y, м"
                    : placeholders[formatIn].lon;

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
                          inputMode={isSourceProjected || formatIn === "deg_dec" ? "decimal" : "text"}
                          placeholder={ph1}
                          value={val1}
                          onChange={(e) => {
                            const v = e.target.value === "" ? undefined : e.target.value;
                            setRowsIn(
                              rowsIn.map((rr, idx) =>
                                idx === i
                                  ? isSourceProjected
                                    ? { ...rr, x: v }
                                    : { ...rr, lat: v }
                                  : rr,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="pl-1 md:p-2">
                        <input
                          className="input w-full"
                          type="text"
                          inputMode={isSourceProjected || formatIn === "deg_dec" ? "decimal" : "text"}
                          placeholder={ph2}
                          value={val2}
                          onChange={(e) => {
                            const v = e.target.value === "" ? undefined : e.target.value;
                            setRowsIn(
                              rowsIn.map((rr, idx) =>
                                idx === i
                                  ? isSourceProjected
                                    ? { ...rr, y: v }
                                    : { ...rr, lon: v }
                                  : rr,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="p-2" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-auto space-y-3">
            <p className="coordinate-row-summary text-xs opacity-70">
              {rowsIn.length > 5 && <>Показано {visibleRowsIn.length} из {rowsIn.length} строк. В пересчёт передаются все строки.</>}
            </p>
          <div className="coordinate-actions coordinate-actions--source">
            <button className="btn h-10 px-2 justify-center text-sm leading-4 min-w-0" onClick={addRow} type="button">
              Добавить точку
            </button>
            <button
              className="btn h-10 px-2 justify-center text-sm leading-4 min-w-0"
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
            {canExpandRows && (
              <button
                className="coordinate-expand btn h-10 px-2 justify-center text-sm min-w-0"
                type="button"
                aria-expanded={rowsExpanded}
                aria-controls="input-coordinate-table result-coordinate-table"
                onClick={() => setRowsExpanded(expanded => !expanded)}
              >
                {rowsExpanded ? "Свернуть" : "Развернуть"}
                <span className={"transition-transform " + (rowsExpanded ? "rotate-180" : "")}>
                  <IconChevronDown />
                </span>
              </button>
            )}
          </div>
          </div>
        </section>

        {/* Результат */}
        <section className="coordinate-card card card-overflow-visible p-4 md:p-5 flex flex-col gap-4 min-w-0 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-400/50">
          <div className="text-lg font-semibold">Результат</div>
          {showCrsInfo && <CrsInfo key={crsTo} crs={targetCrs} />}

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
                  <span className="truncate">
                    {getCrsLabel(crsTo, 30)}
                  </span>
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
                    disabled={isResultProjected}
                  >
                    {s.t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Таблица результата */}
          <div className="table-wrap">
            <table id="result-coordinate-table" className="min-w-full table-fixed text-sm table-xs">
              <colgroup>
                <col className="w-10 md:w-12" />
                <col className="w-[45%] md:w-48" />
                <col className="w-[45%] md:w-48" />
              </colgroup>
              <thead>
                <tr className="text-left">
                  <th className="p-2">№</th>
                  <th className="p-2">
                    {isResultProjected ? "X — восток (м)" : "Широта"}
                  </th>
                  <th className="p-2">
                    {isResultProjected ? "Y — север (м)" : "Долгота"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRowsOut.map((r, i) => {
                  const val1 = isResultProjected ? r.x ?? "-" : formatAngle(r.lat, formatOut);
                  const val2 = isResultProjected ? r.y ?? "-" : formatAngle(r.lon, formatOut);
                  return (
                    <tr
                      key={i}
                      className="border-t border-slate-200/60 dark:border-slate-700/60"
                    >
                      <td className="p-2">{i + 1}</td>
                      <td className="pr-1 md:p-2">
                        <input
                          className="input w-full text-center"
                          value={val1 as any}
                          readOnly
                        />
                      </td>
                      <td className="pl-1 md:p-2">
                        <input
                          className="input w-full text-center"
                          value={val2 as any}
                          readOnly
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-auto space-y-3">
            <p className="coordinate-row-summary text-xs opacity-70">
              {rowsOut.length > 5 && <>Показано {visibleRowsOut.length} из {rowsOut.length} строк. В выгрузку включаются все строки.</>}
            </p>
          <div className="coordinate-actions coordinate-actions--result" data-expandable={canExpandRows}>
            <button
              className="coordinate-calculate btn btn-primary h-10 px-2 justify-center text-sm min-w-0"
              onClick={recalc}
              disabled={loading}
              type="button"
            >
              {loading ? "Пересчитываю..." : "Пересчитать"}
            </button>
            <div className="coordinate-status flex items-center text-xs leading-4" role="status">
              {ok && "Готово: координаты пересчитаны"}
            </div>
          </div>
          </div>
        </section>
      </div>

      {/* Предпросмотр Excel */}
      {preview.length > 0 && (
        <section className="card p-3">
          <div className="font-medium mb-2">
            Импорт Excel
          </div>
          <p className="text-sm mb-2" role="status">{importSummary}</p>
          <pre className="text-xs overflow-auto max-h-48">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>
      )}

      {/* Portal keeps the toast outside the scrolling, blurred modal card. */}
      {toast && createPortal(
        <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[1100] flex justify-center pointer-events-none">
          <div
            role={toast.tone === "error" ? "alert" : "status"}
            aria-atomic="true"
            className={`flex w-full max-w-xl items-center gap-3 rounded-2xl border bg-white/95 dark:bg-slate-900/95 px-4 py-2 shadow-lg backdrop-blur pointer-events-auto ${
              toast.tone === "error"
                ? "border-amber-500/50"
                : "border-brand-500/50"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                toast.tone === "error"
                  ? "border-amber-500 text-amber-700 dark:text-amber-300"
                  : "border-brand-500 text-brand-600 dark:text-brand-400"
              }`}
            >
              {toast.tone === "error" ? "!" : "i"}
            </span>
            <p className="min-w-0 flex-1 break-words text-sm leading-5">{toast.message}</p>
            <button
              type="button"
              aria-label="Закрыть уведомление"
              onClick={() => setToast(null)}
              className="btn btn-ghost h-10 w-10 shrink-0 justify-center !px-0"
            >
              <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
