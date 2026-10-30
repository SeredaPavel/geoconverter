export const UTM_CODE = "UTM_WGS84";
export type UtmSettings = { zone: string; hemisphere: "N" | "S" };
export const defaultUtmSettings = (): UtmSettings => ({ zone: "", hemisphere: "N" });

export function utmRequest(settings: UtmSettings, available?: number[]) {
  const zone = Number(settings.zone);
  if (!available?.length) throw new Error("Не загружен список зон UTM. Обновите список СК.");
  if (!Number.isInteger(zone) || !available.includes(zone)) throw new Error("Выберите зону UTM от 1 до 60.");
  if (!["N", "S"].includes(settings.hemisphere)) throw new Error("Выберите полушарие UTM.");
  return { zone, hemisphere: settings.hemisphere };
}
