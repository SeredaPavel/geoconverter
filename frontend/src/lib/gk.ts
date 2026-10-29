export type GkSettings = { auto_zone: boolean; zone_mode: 3 | 6; zone: string };
export type GkZones = Partial<Record<3 | 6, number[]>>;

export const defaultGkSettings = (): GkSettings => ({ auto_zone: true, zone_mode: 6, zone: "7" });

// Capabilities come from /crs, so the form and calculation use the same zone registry.
export function gkRequest(settings: GkSettings, zones?: GkZones) {
  const available = zones?.[settings.zone_mode];
  if (!available?.length) throw new Error("Не загружены доступные зоны ГК. Обновите список СК.");
  const zone = settings.auto_zone ? null : Number(settings.zone);
  if (zone !== null && (!Number.isInteger(zone) || !available.includes(zone))) {
    throw new Error(`Выберите зону ГК ${settings.zone_mode}°: ${available[0]}–${available[available.length - 1]}.`);
  }
  return { auto_zone: settings.auto_zone, zone_mode: settings.zone_mode, zone };
}
