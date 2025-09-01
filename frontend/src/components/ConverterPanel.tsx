// /geoconverter/frontend/src/components/ConverterPanel.tsx
"use client";
import { useMemo, useState } from "react";

type Point = { lat?: number; lon?: number; x?: number; y?: number; name?: string };
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export default function ConverterPanel() {
  const [crsFrom, setCrsFrom] = useState("EPSG:4326");
  const [crsTo, setCrsTo] = useState("EPSG:4326");
  const [format, setFormat] = useState<"deg_dec" | "deg_min" | "deg_min_sec">("deg_dec");
  const [rows, setRows] = useState<Point[]>([{ lat: 43.771447, lon: 44.59519 }]);
  const [zoneMode, setZoneMode] = useState<3 | 6>(6);
  const [autoZone, setAutoZone] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const addRow = () => setRows(r => [...r, {}]);
  const delRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));
  const reverse = () => { setCrsFrom(crsTo); setCrsTo(crsFrom); };

  const canUploadHint = "• Только Excel ≤ 1 МБ\n• Ровно ДВЕ колонки: Lat/Lon ИЛИ X/Y";

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
          points: rows,
          options: { auto_zone: autoZone, zone_mode: zoneMode }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка пересчёта");
      setRows(data.points);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onImport = async (f: File) => {
    if (f.size > 1_000_000) { alert("Файл больше 1 МБ"); return; }
    if (!confirm(`Импорт файла: ${f.name}\n\n${canUploadHint}`)) return;
    const fd = new FormData(); fd.append("file", f);
    const res = await fetch(`${API_BASE}/import`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { alert(data.detail || "Ошибка импорта"); return; }
    setPreview(data.rows_preview);
    alert(`Прочитано строк: ${data.rows_total}. Предпросмотр внизу.`);
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <img src="/assets/geoconverter_logo.svg" alt="ГеоКонвертер" className="h-10" />
        <div className="text-xl font-semibold">ГеоКонвертер</div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm">Исходная СК</label>
          <select className="input w-full" value={crsFrom} onChange={e => setCrsFrom(e.target.value)}>
            {crsOptions.map(o => <option key={o.code} value={o.code}>{o.title}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm">Целевая СК</label>
          <select className="input w-full" value={crsTo} onChange={e => setCrsTo(e.target.value)}>
            {crsOptions.map(o => <option key={o.code} value={o.code}>{o.title}</option>)}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <label className="text-sm">Формат координат</label>
          <select className="input w-full" value={format} onChange={e => setFormat(e.target.value as any)}>
            <option value="deg_dec">гг.ггг°</option>
            <option value="deg_min">гг°мм.мм′</option>
            <option value="deg_min_sec">гг°мм′cc″</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm">Авто-зона ГК</label>
          <div className="flex gap-3 items-center">
            <input type="checkbox" checked={autoZone} onChange={e => setAutoZone(e.target.checked)} />
            <span className="text-sm">вкл.</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm">Ширина зоны</label>
          <select className="input w-full" value={zoneMode} onChange={e => setZoneMode(Number(e.target.value) as any)}>
            <option value={6}>6°</option>
            <option value={3}>3°</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
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
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-200/60 dark:border-slate-700/60">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">
                  <input className="input w-40" type="number" value={r.lat ?? ""} onChange={e => {
                    const v = e.target.value === "" ? undefined : Number(e.target.value);
                    setRows(rows.map((rr, idx) => idx === i ? { ...rr, lat: v } : rr));
                  }} />
                </td>
                <td className="p-2">
                  <input className="input w-40" type="number" value={r.lon ?? ""} onChange={e => {
                    const v = e.target.value === "" ? undefined : Number(e.target.value);
                    setRows(rows.map((rr, idx) => idx === i ? { ...rr, lon: v } : rr));
                  }} />
                </td>
                <td className="p-2">
                  <input className="input w-52" value={r.name ?? ""} onChange={e => {
                    const v = e.target.value || undefined;
                    setRows(rows.map((rr, idx) => idx === i ? { ...rr, name: v } : rr));
                  }} />
                </td>
                <td className="p-2">
                  <button className="btn" onClick={() => delRow(i)}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="btn" onClick={addRow}>Добавить точку</button>
        <button className="btn" onClick={reverse}>Реверс</button>
        <button className="btn" onClick={recalc} disabled={loading}>
          {loading ? "Пересчитываю..." : "Пересчитать"}
        </button>

        <label className="btn cursor-pointer">
          <input hidden type="file" accept=".xlsx" onChange={(e) => {
            const f = e.target.files?.[0]; if (f) onImport(f);
            e.currentTarget.value = "";
          }} />
          Импорт Excel
        </label>

        <a className="btn" href="/templates/template_latlon.xlsx">Шаблон Lat/Lon</a>
        <a className="btn" href="/templates/template_xy.xlsx">Шаблон X/Y</a>
      </div>

      {preview.length > 0 && (
        <div className="card p-3">
          <div className="font-medium mb-2">Предпросмотр Excel (первые строки):</div>
          <pre className="text-xs overflow-auto">{JSON.stringify(preview, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
