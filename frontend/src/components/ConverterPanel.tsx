// /geoconverter/frontend/src/components/ConverterPanel.tsx
"use client";
import { useMemo, useState } from "react";

type Point = { lat?: number; lon?: number; x?: number; y?: number; name?: string };
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

/* Лёгкие inline-иконки (без внешних зависимостей) */
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconUpload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12V8l-4-6z" stroke="currentColor" strokeWidth="2"/>
    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 4v10m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function ConverterPanel() {
  const [crsFrom, setCrsFrom] = useState("EPSG:4326");
  const [crsTo, setCrsTo] = useState("EPSG:4326");
  const [format, setFormat] = useState<"deg_dec" | "deg_min" | "deg_min_sec">("deg_dec");
  const [rowsIn, setRowsIn] = useState<Point[]>([{ lat: 43.771447, lon: 44.59519 }]);
  const [rowsOut, setRowsOut] = useState<Point[]>([]);
  const [zoneMode, setZoneMode] = useState<3 | 6>(6);
  const [autoZone, setAutoZone] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  const crsOptions = useMemo(() => ([
    { code: "EPSG:4326", title: "WGS 84 (готово)" },
    { code: "GSK2011_GEOG", title: "ГСК-2011 (в разработке)" },
    { code: "SK42_GEOG", title: "СК-42 (в разработке)" },
    { code: "SK95_GEOG", title: "СК-95 (в разработке)" },
    { code: "PZ90_GEOG", title: "ПЗ-90 (в разработке)" },
    { code: "MSK:DNR", title: "МСК ДНР (в разработке)" },
    { code: "MSK:LNR", title: "МСК ЛНР (в разработке)" },
    { code: "MSK:KHER", title: "МСК Херсонская обл. (в разработке)" },
    { code: "MSK:ZAPR", title: "МСК Запорожская обл. (в разработке)" },
  ]), []);

  const addRow = () => setRowsIn(r => [...r, {}]);
  const delRow = (idx: number) => setRowsIn(r => r.filter((_, i) => i !== idx));
  const reverse = () => { setCrsFrom(crsTo); setCrsTo(crsFrom); };

  const recalc = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crs_from: crsFrom,
          crs_to: crsTo,
          format_in: format,
          format_out: format,
          points: rowsIn,
          options: { auto_zone: autoZone, zone_mode: zoneMode }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка пересчёта");
      setRowsOut(data.points || []);
      setToast("Готово: координаты пересчитаны");
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const canUploadHint = "• Только Excel ≤ 1 МБ\n• Ровно ДВЕ колонки: Lat/Lon ИЛИ X/Y";
  const onImport = async (f: File) => {
    if (f.size > 1_000_000) { setToast("Файл больше 1 МБ"); return; }
    const fd = new FormData(); fd.append("file", f);
    const res = await fetch(`${API_BASE}/import`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setToast(data.detail || "Ошибка импорта"); return; }
    setPreview(data.rows_preview || []);
    setToast(`Прочитано строк: ${data.rows_total}. Предпросмотр внизу.`);
  };

  const exportFile = async (kind: "catalog" | "statement") => {
    try {
      const res = await fetch(`${API_BASE}/export/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crs_from: crsFrom, crs_to: crsTo, format, rows_in: rowsIn, rows_out: rowsOut
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

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* ЛЕВАЯ КОЛОНКА — ВВОД */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <img src="/assets/geoconverter_logo.svg" alt="ГеоКонвертер" className="h-9" />
          <div className="text-lg font-semibold">Исходные данные</div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs opacity-70">Исходная СК</label>
            <select className="select w-full" value={crsFrom} onChange={e => setCrsFrom(e.target.value)}>
              {crsOptions.map(o => <option key={o.code} value={o.code}>{o.title}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs opacity-70">Целевая СК</label>
            <select className="select w-full" value={crsTo} onChange={e => setCrsTo(e.target.value)}>
              {crsOptions.map(o => <option key={o.code} value={o.code}>{o.title}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs opacity-70">Формат</label>
            <div className="segment">
              {[
                { k: "deg_dec", t: "гг.ггг°" },
                { k: "deg_min", t: "гг°мм.мм′" },
                { k: "deg_min_sec", t: "гг°мм′сс″" },
              ].map(s => (
                <button
                  key={s.k}
                  onClick={() => setFormat(s.k as any)}
                  className={s.k === format ? "active" : ""}
                >
                  {s.t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs opacity-70">Авто-зона ГК</label>
            <div className="flex items-center gap-2 h-10">
              <input id="autoZone" type="checkbox" checked={autoZone} onChange={e => setAutoZone(e.target.checked)} />
              <label htmlFor="autoZone" className="text-sm">вкл.</label>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs opacity-70">Ширина зоны</label>
            <select className="select w-full" value={zoneMode} onChange={e => setZoneMode(Number(e.target.value) as any)}>
              <option value={6}>6°</option>
              <option value={3}>3°</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs opacity-70">Каталоги/Ведомости</label>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => exportFile("statement")} title="Ведомость пересчёта">
                <IconDownload /> Ведомость
              </button>
              <button className="btn" onClick={() => exportFile("catalog")} title="Каталог координат">
                <IconDownload /> Каталог
              </button>
            </div>
          </div>
        </div>

        {/* Таблица ввода: обёртка для горизонтального скролла + компактный кегль на мобиле */}
        <div className="table-wrap">
          <table className="min-w-full text-sm table-xs">
            <thead>
              <tr className="text-left">
                <th className="p-2">№</th>
                <th className="p-2">Широта (lat)</th>
                <th className="p-2">Долгота (lon)</th>
                <th className="p-2">Имя точки</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rowsIn.map((r, i) => (
                <tr key={i} className="border-t border-slate-200/60 dark:border-slate-700/60">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">
                    <input
                      className="input w-40"
                      type="number"
                      value={r.lat ?? ""}
                      onChange={e => {
                        const v = e.target.value === "" ? undefined : Number(e.target.value);
                        setRowsIn(rowsIn.map((rr, idx) => idx === i ? { ...rr, lat: v } : rr));
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="input w-40"
                      type="number"
                      value={r.lon ?? ""}
                      onChange={e => {
                        const v = e.target.value === "" ? undefined : Number(e.target.value);
                        setRowsIn(rowsIn.map((rr, idx) => idx === i ? { ...rr, lon: v } : rr));
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="input w-52"
                      value={r.name ?? ""}
                      onChange={e => {
                        const v = e.target.value || undefined;
                        setRowsIn(rowsIn.map((rr, idx) => idx === i ? { ...rr, name: v } : rr));
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <button className="btn" onClick={() => delRow(i)} title="Удалить">
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={addRow}>Добавить точку</button>
          <button className="btn" onClick={reverse}>Реверс</button>

          <div className="dropdown">
            <button className="btn" onClick={() => setOpenImport(v => !v)}>
              <IconUpload /> Импорт <IconChevronDown />
            </button>
            {openImport && (
              <div className="dropdown-menu" onMouseLeave={() => setOpenImport(false)}>
                <label className="btn w-full justify-start">
                  <input
                    hidden
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) onImport(f);
                      e.currentTarget.value = "";
                      setOpenImport(false);
                    }}
                  />
                  <IconUpload /> Загрузить Excel
                </label>
                <a className="btn w-full justify-start" href="/templates/template_latlon.xlsx">
                  <IconFile /> Шаблон Lat/Lon
                </a>
                <a className="btn w-full justify-start" href="/templates/template_xy.xlsx">
                  <IconFile /> Шаблон X/Y
                </a>
                <div
                  className={`dropzone ${drag ? "drag" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setDrag(false);
                    const f = e.dataTransfer.files?.[0]; if (f) onImport(f);
                    setOpenImport(false);
                  }}
                >
                  Перетащите Excel сюда<br/>{canUploadHint}
                </div>
              </div>
            )}
          </div>
        </div>

        {preview.length > 0 && (
          <div className="card p-3">
            <div className="font-medium mb-2">Предпросмотр Excel (первые строки):</div>
            <pre className="text-xs overflow-auto">{JSON.stringify(preview, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* ПРАВАЯ КОЛОНКА — РЕЗУЛЬТАТЫ */}
      <section className="lg:sticky lg:top-6 h-fit card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Результат</div>
          <button className="btn btn-primary" onClick={recalc} disabled={loading}>
            {loading ? "Пересчитываю..." : "Пересчитать"}
          </button>
        </div>

        {/* Таблица результата: та же обёртка для скролла и компактный кегль */}
        <div className="table-wrap">
          <table className="min-w-full text-sm table-xs">
            <thead>
              <tr className="text-left">
                <th className="p-2">№</th>
                <th className="p-2">Широта</th>
                <th className="p-2">Долгота</th>
              </tr>
            </thead>
            <tbody>
              {rowsOut.length === 0 ? (
                <tr><td className="p-2 text-slate-500" colSpan={3}>Нет данных. Нажмите «Пересчитать».</td></tr>
              ) : rowsOut.map((r, i) => (
                <tr key={i} className="border-t border-slate-200/60 dark:border-slate-700/60">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{r.lat ?? r.y ?? "-"}</td>
                  <td className="p-2">{r.lon ?? r.x ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Тост */}
      {toast && (
        <div className="fixed right-4 bottom-4 z-50">
          <div className="card px-4 py-3">{toast}</div>
          <button className="mt-2 btn" onClick={() => setToast(null)}>Ок</button>
        </div>
      )}
    </div>
  );
}
