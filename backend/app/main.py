# /geoconverter/backend/app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from functools import lru_cache

from .schemas import (
    ConvertRequest,
    ConvertResponse,
    Point,
    CRSItem,
    ConvertOptions,
)
from .utils import auto_zone_6, auto_zone_3  # пока не используем, но оставляем импорт
from pyproj import CRS, Transformer
import pandas as pd
import io, os, time, uuid
from pathlib import Path

app = FastAPI(title="ГеоКонвертер API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
RETENTION = int(os.getenv("UPLOAD_RETENTION_SEC", "3600"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def cleanup_uploads() -> int:
    now = time.time()
    removed = 0
    for p in UPLOAD_DIR.glob("*"):
        try:
            if p.is_file() and now - p.stat().st_mtime > RETENTION:
                p.unlink(missing_ok=True)
                removed += 1
        except Exception:
            # Нам важнее не упасть, чем идеально почистить
            pass
    return removed


@app.on_event("startup")
def _startup_cleanup():
    cleanup_uploads()


# --- CRS реестр ---------------------------------------------------------

CRS_REGISTRY: List[CRSItem] = [
    # Геодезические СК
    CRSItem(
        code="EPSG:4326",
        title="WGS-84 (географические)",
        category="geographic",
        status="ready",
    ),
    CRSItem(
        code="GSK2011_GEOG",
        title="ГСК-2011 (географические)",
        category="geographic",
        status="dev",
    ),
    CRSItem(
        code="SK42_GEOG",
        title="Пулково-1942 (географические)",
        category="geographic",
        status="dev",
    ),
    CRSItem(
        code="SK95_GEOG",
        title="Пулково 1995 (географические)",
        category="geographic",
        status="dev",
    ),
    CRSItem(
        code="PZ90_GEOG",
        title="ПЗ-90 (географические)",
        category="geographic",
        status="dev",
    ),
    CRSItem(
        code="PZ90_02_GEOG",
        title="ПЗ-90.02 (географические)",
        category="geographic",
        status="dev",
    ),
    CRSItem(
        code="PZ90_11_GEOG",
        title="ПЗ-90.11 (географические)",
        category="geographic",
        status="dev",
    ),

    # Проекция Гаусса-Крюгера
    CRSItem(
        code="GK_GSK2011",
        title="ГК-ГСК-2011 (6° зоны)",
        category="projected",
        status="dev",
    ),
    CRSItem(
        code="GK_SK42",
        title="ГК-СК-42 (6° зоны)",
        category="projected",
        status="ready",
    ),
    CRSItem(
        code="GK_SK95",
        title="ГК-СК-95 (6° зоны)",
        category="projected",
        status="dev",
    ),

    # МСК (пока одной записью, полный список МСК-01...87 вынесем в YAML отдельно)
    CRSItem(
        code="MSK:RU-XX",
        title="МСК (выберите регион)",
        category="msk",
        status="dev",
        region="RU-XX",
    ),

    # Резерв под СК-63 (зоны появятся позже)
    CRSItem(
        code="SK63:RU-XX",
        title="СК-63 (выберите регион/зону)",
        category="sk63",
        status="dev",
        region="RU-XX",
    ),
]

# --- Внутренний движок для WGS-84 ⇄ ГК-СК-42 (6° зоны) ------------------

WGS84_CRS = CRS.from_epsg(4326)


@lru_cache(maxsize=32)
def _crs_gk_sk42_6(zone: int) -> CRS:
    """
    Pulkovo 1942 / Gauss-Kruger zone N.
    Для России используются зоны 2–33 (примерно 12°E–198°E).
    EPSG-коды: 28402, 28403, ..., 28433. :contentReference[oaicite:1]{index=1}
    """
    if zone < 2 or zone > 33:
        raise HTTPException(
            status_code=400,
            detail=f"Зона ГК-СК-42 должна быть в диапазоне 2–33, получено: {zone}",
        )
    epsg_code = 28400 + zone
    return CRS.from_epsg(epsg_code)


@lru_cache(maxsize=32)
def _tr_wgs84_to_gk_sk42(zone: int) -> Transformer:
    return Transformer.from_crs(WGS84_CRS, _crs_gk_sk42_6(zone), always_xy=True)


@lru_cache(maxsize=32)
def _tr_gk_sk42_to_wgs84(zone: int) -> Transformer:
    return Transformer.from_crs(_crs_gk_sk42_6(zone), WGS84_CRS, always_xy=True)


def _detect_zone_from_lon(lon: float, opts: ConvertOptions) -> int:
    """
    Авто-определение 6°-зоны Гаусса-Крюгера по долготе.

    Классическая схема: zone = floor(λ / 6) + 1.
    Для долгот 36–42° → zone = 7 → EPSG:28407. :contentReference[oaicite:2]{index=2}
    """
    if opts.zone_mode != 6:
        raise HTTPException(
            status_code=400,
            detail="Для ГК-СК-42 сейчас реализованы только 6° зоны. Выберите ширину зоны 6°.",
        )

    # Нормируем долготу в диапазон [-180, 180] на всякий случай
    lon_norm = ((lon + 180.0) % 360.0) - 180.0

    zone = int(lon_norm // 6.0) + 1  # 0–6 → 1, 6–12 → 2, ..., 36–42 → 7 и т.д.

    if zone < 1 or zone > 60:
        raise HTTPException(
            status_code=400,
            detail=f"Не удалось определить 6° зону ГК по долготе {lon}. Получена зона {zone}.",
        )

    return zone


def _detect_zone_from_x(x: float, opts: ConvertOptions) -> int:
    """
    Для Гаусса-Крюгера (6°) X ≈ ZONE * 1_000_000 + 500_000.
    Берём целую часть от деления на 1_000_000 как номер зоны.
    """
    if x <= 0:
        raise HTTPException(status_code=400, detail="Некорректное значение X для ГК-СК-42.")

    zone = int(x // 1_000_000)

    if zone < 1 or zone > 60:
        raise HTTPException(
            status_code=400,
            detail=f"Не удалось определить зону по X={x} для ГК-СК-42 (получена зона {zone}).",
        )

    return zone


def _convert_wgs84_to_gk_sk42(points: List[Point], opts: ConvertOptions) -> tuple[List[Point], List[int]]:
    out: List[Point] = []
    used_zones: set[int] = set()

    for p in points:
        if p.lat is None or p.lon is None:
            raise HTTPException(
                status_code=400,
                detail="Для WGS-84 → ГК-СК-42 нужно заполнить lat и lon.",
            )

        zone = _detect_zone_from_lon(p.lon, opts)
        used_zones.add(zone)

        tr = _tr_wgs84_to_gk_sk42(zone)
        # always_xy=True → (lon, lat)
        x, y = tr.transform(p.lon, p.lat)
        out.append(Point(x=x, y=y, name=p.name))

    return out, sorted(used_zones)


def _convert_gk_sk42_to_wgs84(points: List[Point], opts: ConvertOptions) -> tuple[List[Point], List[int]]:
    out: List[Point] = []
    used_zones: set[int] = set()

    for p in points:
        if p.x is None or p.y is None:
            raise HTTPException(
                status_code=400,
                detail="Для ГК-СК-42 → WGS-84 нужно заполнить X и Y.",
            )

        zone = _detect_zone_from_x(p.x, opts)
        used_zones.add(zone)

        tr = _tr_gk_sk42_to_wgs84(zone)
        lon, lat = tr.transform(p.x, p.y)
        out.append(Point(lat=lat, lon=lon, name=p.name))

    return out, sorted(used_zones)


# --- Эндпоинты ----------------------------------------------------------


@app.get("/health")
def health():
    removed = cleanup_uploads()
    return {"status": "ok", "cleaned_files": removed}


@app.get("/crs", response_model=List[CRSItem])
def list_crs():
    return CRS_REGISTRY


@app.post("/convert", response_model=ConvertResponse)
def convert(req: ConvertRequest):
    # 1) Спец-случай: WGS-84 ⇄ ГК-СК-42 (6° зоны)
    if req.crs_from == "EPSG:4326" and req.crs_to == "GK_SK42":
        points, zones = _convert_wgs84_to_gk_sk42(req.points, req.options)
        meta = {
            "engine": "pyproj EPSG:4326 → EPSG:284xx",
            "auto_zone": req.options.auto_zone,
            "zone_mode": req.options.zone_mode,
            "used_zones": zones,
        }
        return ConvertResponse(
            crs_from=req.crs_from,
            crs_to=req.crs_to,
            points=points,
            meta=meta,
        )

    if req.crs_from == "GK_SK42" and req.crs_to == "EPSG:4326":
        points, zones = _convert_gk_sk42_to_wgs84(req.points, req.options)
        meta = {
            "engine": "pyproj EPSG:284xx → EPSG:4326",
            "auto_zone": req.options.auto_zone,
            "zone_mode": req.options.zone_mode,
            "used_zones": zones,
        }
        return ConvertResponse(
            crs_from=req.crs_from,
            crs_to=req.crs_to,
            points=points,
            meta=meta,
        )

    # 2) Общий случай: только EPSG-коды, как и раньше
    def resolve_crs(code: str) -> CRS:
        if code.startswith("EPSG:"):
            return CRS.from_user_input(code)
        raise HTTPException(
            status_code=400,
            detail=f"CRS '{code}' пока не сконфигурирован (в разработке).",
        )

    src = resolve_crs(req.crs_from)
    dst = resolve_crs(req.crs_to)
    tr = Transformer.from_crs(src, dst, always_xy=True)

    out_points: List[Point] = []
    for p in req.points:
        if p.lat is not None and p.lon is not None:
            x, y = tr.transform(p.lon, p.lat)
            out_points.append(Point(lat=y, lon=x, name=p.name))
        elif p.x is not None and p.y is not None:
            x, y = tr.transform(p.x, p.y)
            out_points.append(Point(x=x, y=y, name=p.name))
        else:
            raise HTTPException(
                status_code=400,
                detail="Точка должна содержать пару lat/lon или x/y.",
            )

    meta = {
        "auto_zone": req.options.auto_zone,
        "zone_mode": req.options.zone_mode,
        "note": "Полные трансформации ГСК-2011/СК-42/СК-95/МСК будут добавляться по мере подключения гридов.",
    }

    return ConvertResponse(
        crs_from=req.crs_from,
        crs_to=req.crs_to,
        points=out_points,
        meta=meta,
    )


@app.post("/import")
async def import_excel(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 1_000_000:
        raise HTTPException(
            status_code=400,
            detail="Файл больше 1 МБ. Сократите размер.",
        )

    fid = f"{int(time.time())}_{uuid.uuid4().hex}.xlsx"
    path = UPLOAD_DIR / fid
    path.write_bytes(content)

    cleanup_uploads()

    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        try:
            path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Не удалось прочитать Excel: {e}",
        )

    if df.shape[1] != 2:
        try:
            path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail="В файле должно быть ровно 2 колонки (Lat/Lon или X/Y).",
        )

    head = df.head(10).to_dict(orient="records")
    return {
        "rows_preview": head,
        "rows_total": int(df.shape[0]),
        "file_id": fid,
        "kept_seconds": RETENTION,
    }
