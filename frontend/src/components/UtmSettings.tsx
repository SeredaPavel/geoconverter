import { UtmSettings as Settings } from "@/lib/utm";

export default function UtmSettings({ side, value, zones, onChange }: {
  side: "source" | "target"; value: Settings; zones: number[]; onChange: (value: Settings) => void;
}) {
  const id = `utm-${side}`;
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="font-semibold text-sm mb-2">
        {side === "source" ? "Зона исходной UTM" : "Зона целевой UTM"}
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <label htmlFor={`${id}-zone`} className="text-xs space-y-1 min-w-0">
          <span className="opacity-70">Номер зоны</span>
          <select id={`${id}-zone`} className="select w-full h-10" value={value.zone}
            onChange={e => onChange({ ...value, zone: e.target.value })}>
            <option value="" disabled>Выберите зону</option>
            {zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
        <label htmlFor={`${id}-hemisphere`} className="text-xs space-y-1 min-w-0">
          <span className="opacity-70">Полушарие</span>
          <select id={`${id}-hemisphere`} className="select w-full h-10" value={value.hemisphere}
            onChange={e => onChange({ ...value, hemisphere: e.target.value as "N" | "S" })}>
            <option value="N">Северное</option>
            <option value="S">Южное</option>
          </select>
        </label>
      </div>
      <p className="text-xs opacity-70">Номер зоны и полушарие берите из исходных данных. X — восток, Y — север, в метрах; X не содержит номер зоны.</p>
    </fieldset>
  );
}
