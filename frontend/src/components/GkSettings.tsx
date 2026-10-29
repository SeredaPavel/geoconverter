import { GkSettings as Settings, GkZones } from "@/lib/gk";

export default function GkSettings({ side, value, zones, onChange }: {
  side: "source" | "target";
  value: Settings;
  zones?: GkZones;
  onChange: (value: Settings) => void;
}) {
  const available = zones?.[value.zone_mode] || [];
  const id = `gk-${side}`;
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="font-semibold text-sm mb-2">
        {side === "source" ? "Зона исходной ГК" : "Зона целевой ГК"}
      </legend>
      {!zones ? <p className="text-xs opacity-70">Для выбранной СК настройки зоны не требуются.</p> : <>
        <div className="grid grid-cols-2 gap-3">
          <label htmlFor={`${id}-width`} className="text-xs space-y-1">
            <span className="opacity-70">Ширина зоны</span>
            <select id={`${id}-width`} className="select w-full h-10"
              value={value.zone_mode} onChange={e => {
                const width = Number(e.target.value) as 3 | 6;
                const valid = zones[width] || [];
                onChange({ ...value, zone_mode: width,
                  zone: valid.includes(Number(value.zone)) ? value.zone : String(valid[0] ?? "") });
              }}>
              {([6, 3] as const).map(width => <option key={width} value={width}
                disabled={!zones[width]?.length}>{width}°</option>)}
            </select>
          </label>
          <label htmlFor={`${id}-zone`} className="text-xs space-y-1">
            <span className="opacity-70">Номер зоны</span>
            <select id={`${id}-zone`} className="select w-full h-10" value={value.zone}
              disabled={value.auto_zone} onChange={e => onChange({ ...value, zone: e.target.value })}>
              {available.map(zone => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm" htmlFor={`${id}-auto`}>
          <input id={`${id}-auto`} type="checkbox" checked={value.auto_zone}
            onChange={e => onChange({ ...value, auto_zone: e.target.checked })} />
          Определять зону автоматически
        </label>
        <p className="text-xs opacity-70">
          {value.auto_zone ? side === "source"
            ? "Номер берётся из миллионного префикса X — восток. Ширину зоны задайте вручную."
            : "Номер определяется по долготе каждой точки в целевой СК."
            : "Выбранная зона применяется ко всем точкам этой стороны."}
        </p>
        {available.length > 0 && <p className="text-xs opacity-70">
          Доступные номера: {available[0]}–{available[available.length - 1]}.
        </p>}
      </>}
    </fieldset>
  );
}
