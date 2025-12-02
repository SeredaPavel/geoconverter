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
  [r.lat, r.lon, r.x, r.y].every(
    (v) => v === undefined || v === null || Number.isNaN(v as any),
  );

type CrsOption = {
  code: string;
  title: string;
  group: string;
  category: string; // 'geographic' | 'projected' | 'msk' | ...
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

  // опции
  const [zoneMode, setZoneMode] = useState<3 | 6>(6);
  const [autoZone, setAutoZone] = useState(true);
  const [loading, setLoading] = useState(false);

  // UI
  const [preview, setPreview] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // CRS-опции
  const [crsOptions, setCrsOptions] = useState<CrsOption[]>([]);

  // выпадашки
  const [openImport, setOpenImport] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const importRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [openZoneMenu, setOpenZoneMenu] = useState(false);
  const zoneRef = useRef<HTMLDivElement | null>(null);

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
              : status === "ready"
              ? " (готово)"
              : "";
          return {
            code: item.code as string,
            group: mapCategoryToGroup(item.category as string),
            title: baseTitle + suffix,
            category: (item.category as string) || "other",
          };
        });

        setCrsOptions(mapped);
      } catch (e: any) {
        setToast(e.message || "Ошибка загрузки списка СК");
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
    setCrsFrom(crsTo);
    setCrsTo(crsFrom);
    // данные сознательно не трогаем, пользователь сам решит, что вводить
  };

  // клик-вне и ESC
  useEffect(() => {
    const onDocDown = (e: PointerEvent | MouseEvent) => {
      const t = e.target as Node;
      if (
        !importRef.current?.contains(t) &&
        !exportRef.current?.contains(t) &&
        !crsFromRef.current?.contains(t) &&
        !crsToRef.current?.contains(t) &&
        !zoneRef.current?.contains(t)
      ) {
        setOpenImport(false);
        setOpenExport(false);
        setOpenCrsFromMenu(false);
        setOpenCrsToMenu(false);
        setOpenZoneMenu(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenImport(false);
        setOpenExport(false);
        setOpenCrsFromMenu(false);
        setOpenCrsToMenu(false);
        setOpenZoneMenu(false);
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

  try {
    const res = await fetch(`${API_BASE}/import`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();

    if (!res.ok) {
      setToast(data.detail || "Ошибка импорта");
      return;
    }

    // 1. Превью как и раньше
    const previewRows = Array.isArray(data.rows_preview)
      ? data.rows_preview
      : [];
    setPreview(previewRows);

    if (previewRows.length === 0) {
      setToast("Файл прочитан, но данных не найдено");
      return;
    }

    // 2. Проверяем число колонок
    const first = previewRows[0] || {};
    const keys = Object.keys(first);
    if (keys.length !== 2) {
      setToast("В Excel должно быть ровно 2 колонки");
      return;
    }

    // 3. Определяем, геодезическая ли исходная СК
    const src = crsOptions.find((c) => c.code === crsFrom);
    const sourceIsGeodetic = src?.group === "Геодезические СК";

    const toNum = (v: any): number | undefined => {
      if (v === null || v === undefined || v === "") return undefined;
      if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : undefined;
    };

    // 4. Excel → массив Point[]
    const newRows: Point[] = previewRows.map((row: any) => {
      const a = row[keys[0]];
      const b = row[keys[1]];

      if (sourceIsGeodetic) {
        // Геодезические СК: lat / lon
        return {
          lat: toNum(a),
          lon: toNum(b),
        };
      }

      // Плоские СК (ГК, МСК и т.п.): Y / X
      return {
        y: toNum(a),
        x: toNum(b),
      };
    });

    if (newRows.length === 0) {
      setToast("Не удалось получить корректные координаты из файла");
      return;
    }

    // 5. Вариант А: Excel полностью заменяет таблицу
    setRowsIn(newRows);
    // Сбрасываем результат
    setRowsOut([{ lat: undefined, lon: undefined }]);

    setToast(`Загружено строк: ${newRows.length}. Предпросмотр внизу.`);
  } catch (e: any) {
    console.error(e);
    setToast(e?.message || "Ошибка импорта");
  }
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

      {/* Список СК */}
      <div className="max-h-28 overflow-y-auto py-1">
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
                      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide opacity-60">
                        {o.group}
                      </div>
                    )}
                    <button
                      type="button"
                      className={
                        "w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 " +
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
                      {o.title}
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

  return (
    <div className="grid gap-5 md:gap-6">
      {/* 1) Верхняя полоска */}
      <section className="card card-overflow-visible relative z-20 p-4 md:p-5 grid gap-3 md:grid-cols-5 md:items-end">
        {/* Авто-зона */}
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
          <div className="relative" ref={zoneRef}>
            <button
              type="button"
              className="select w-full h-10 pr-8 flex items-center justify-between text-left"
              onClick={() => setOpenZoneMenu((v) => !v)}
            >
              <span className="truncate">
                {zoneMode === 6 ? "6°" : "3°"}
              </span>
              <span className="ml-2 shrink-0 pointer-events-none opacity-70">
                <IconChevronDown />
              </span>
            </button>

            {openZoneMenu && (
              <div className="absolute top-full left-0 mt-2 z-[1002] min-w-[120px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft py-1">
                {[6, 3].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setZoneMode(v as 3 | 6);
                      setOpenZoneMenu(false);
                    }}
                  >
                    {v}°
                  </button>
                ))}
              </div>
            )}
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
                setOpenZoneMenu(false);
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
                setOpenZoneMenu(false);
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

      {/* 2–3) Блоки */}
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
                    onClick={() => setFormatIn(s.k as any)}
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
                  <th className="p-2">
                    {isSourceProjected ? "Y (м)" : "Широта (lat)"}
                  </th>
                  <th className="p-2">
                    {isSourceProjected ? "X (м)" : "Долгота (lon)"}
                  </th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rowsIn.map((r, i) => {
                  const val1 = isSourceProjected ? r.y ?? "" : r.lat ?? "";
                  const val2 = isSourceProjected ? r.x ?? "" : r.lon ?? "";
                  const ph1 = isSourceProjected
                    ? "Y, м"
                    : placeholders[formatIn].lat;
                  const ph2 = isSourceProjected
                    ? "X, м"
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
                          inputMode="decimal"
                          placeholder={ph1}
                          value={val1}
                          onChange={(e) => {
                            const v =
                              e.target.value === ""
                                ? undefined
                                : Number(
                                    e.target.value.replace(",", "."),
                                  );
                            setRowsIn(
                              rowsIn.map((rr, idx) =>
                                idx === i
                                  ? isSourceProjected
                                    ? { ...rr, y: v }
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
                          inputMode="decimal"
                          placeholder={ph2}
                          value={val2}
                          onChange={(e) => {
                            const v =
                              e.target.value === ""
                                ? undefined
                                : Number(
                                    e.target.value.replace(",", "."),
                                  );
                            setRowsIn(
                              rowsIn.map((rr, idx) =>
                                idx === i
                                  ? isSourceProjected
                                    ? { ...rr, x: v }
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
            <table className="min-w-full table-fixed text-sm table-xs">
              <colgroup>
                <col className="w-10 md:w-12" />
                <col className="w-[45%] md:w-48" />
                <col className="w-[45%] md:w-48" />
              </colgroup>
              <thead>
                <tr className="text-left">
                  <th className="p-2">№</th>
                  <th className="p-2">
                    {isResultProjected ? "Y (м)" : "Широта"}
                  </th>
                  <th className="p-2">
                    {isResultProjected ? "X (м)" : "Долгота"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsOut.map((r, i) => {
                  const val1 = isResultProjected ? r.y ?? "-" : r.lat ?? "-";
                  const val2 = isResultProjected ? r.x ?? "-" : r.lon ?? "-";
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

      {/* Тост */}
      {toast && (
        <div className="fixed right-4 bottom-4 z-[1000] pointer-events-none">
          <div className="card px-4 py-3">{toast}</div>
        </div>
      )}
    </div>
  );
}
