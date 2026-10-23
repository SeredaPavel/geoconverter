export type AngleFormat = "deg_dec" | "deg_min" | "deg_min_sec";
export type Point = { lat?: number | string | null; lon?: number | string | null; x?: number | string | null; y?: number | string | null };

export function parseAngle(value: number | string, limit = 180): number {
  let result: number;
  if (typeof value === "number") {
    result = value;
  } else {
    const text = value.trim().replace(/,/g, ".").replace(/−/g, "-");
    if (!/^[+-]?\d+(?:\.\d+)?(?:[\s°º′'’":″]+\d+(?:\.\d+)?){0,2}[\s°º′'’":″]*$/.test(text)) {
      throw new Error("Введите угол числом или как 55°45′30″");
    }
    const parts = (text.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    if (parts.length > 1 && (!Number.isInteger(parts[0]) || parts[1] >= 60)) {
      throw new Error("Минуты должны быть меньше 60; градусы — целыми");
    }
    if (parts.length === 3 && (!Number.isInteger(parts[1]) || parts[2] >= 60)) {
      throw new Error("Секунды должны быть меньше 60; минуты — целыми");
    }
    result = parts.reduce((sum, part, i) => sum + part / 60 ** i, 0);
    if (text.startsWith("-")) result = -result;
  }
  if (!Number.isFinite(result) || Math.abs(result) > limit) {
    throw new Error(`Угол должен быть конечным числом в диапазоне ±${limit}°`);
  }
  return result;
}

export function formatAngle(value: number | string | null | undefined, format: AngleFormat): number | string {
  if (value == null || value === "") return "";
  const angle = parseAngle(value);
  if (format === "deg_dec") return angle;
  const sign = angle < 0 ? "-" : "";
  const scale = format === "deg_min" ? 10000 : 100;
  const units = format === "deg_min" ? 60 : 3600;
  const total = Math.round(Math.abs(angle) * units * scale);
  const degrees = Math.floor(total / (units * scale));
  const remainder = total % (units * scale);
  if (format === "deg_min") return `${sign}${degrees}°${(remainder / scale).toFixed(4).padStart(7, "0")}′`;
  return `${sign}${degrees}°${Math.floor(remainder / (60 * scale)).toString().padStart(2, "0")}′${((remainder % (60 * scale)) / scale).toFixed(2).padStart(5, "0")}″`;
}

function parseMetres(value: number | string): number {
  const number = typeof value === "number" ? value : Number(value.trim().replace(/,/g, "."));
  if (!Number.isFinite(number) || (typeof value === "string" && !value.trim())) {
    throw new Error("Координата в метрах должна быть конечным числом");
  }
  return number;
}

export function numericPoints(rows: Point[]) {
  return rows.map((row, index) => {
    try {
      return Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
        value == null || value === "" ? undefined
          : key === "lat" || key === "lon" ? parseAngle(value, key === "lat" ? 90 : 180)
          : parseMetres(value),
      ]));
    } catch (error) {
      throw new Error(`Строка ${index + 1}: ${(error as Error).message}`);
    }
  });
}

export function reformatPoints(rows: Point[], format: AngleFormat): Point[] {
  return rows.map(row => ({ ...row,
    lat: row.lat == null || row.lat === "" ? undefined : formatAngle(row.lat, format),
    lon: row.lon == null || row.lon === "" ? undefined : formatAngle(row.lon, format),
  }));
}

export function excelPoints(rows: Record<string, unknown>[], columns: string[], projected: boolean, format: AngleFormat): Point[] {
  if (columns.length !== 2) throw new Error("В Excel должно быть ровно 2 колонки");
  const points = rows.map(row => {
    const a = row[columns[0]];
    const b = row[columns[1]];
    if (a === null || a === undefined || b === null || b === undefined || a === "" || b === "") {
      throw new Error("В каждой строке Excel должны быть две координаты");
    }
    return projected ? { x: String(a), y: String(b) } : { lat: String(a), lon: String(b) };
  });
  return reformatPoints(numericPoints(points), format);
}
