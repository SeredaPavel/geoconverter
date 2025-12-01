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
import io
import os
import time
import uuid
from pathlib import Path

app = FastAPI(title="ГеоКонвертер API", version="0.4.0")

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


# ----------------------------------------------------------------------
# CRS реестр — сюда смотрит фронт, чтобы построить список систем
# ----------------------------------------------------------------------

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
        status="ready",
    ),
    CRSItem(
        code="SK42_GEOG",
        title="Пулково-1942 (географические)",
        category="geographic",
        status="ready",
    ),
    CRSItem(
        code="SK95_GEOG",
        title="Пулково 1995 (географические)",
        category="geographic",
        status="ready",
    ),
    CRSItem(
        code="PZ90_GEOG",
        title="ПЗ-90 (географические)",
        category="geographic",
        status="ready",
    ),
    CRSItem(
        code="PZ90_02_GEOG",
        title="ПЗ-90.02 (географические)",
        category="geographic",
        status="ready",
    ),
    CRSItem(
        code="PZ90_11_GEOG",
        title="ПЗ-90.11 (географические)",
        category="geographic",
        status="ready",
    ),

    # Проекция Гаусса-Крюгера (6° зоны)
    CRSItem(
        code="GK_GSK2011",
        title="ГК-ГСК-2011 (6° зоны)",
        category="projected",
        status="ready",
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
        status="ready",
    ),

    # МСК — полный список зон, пока без движка (status="dev")
    CRSItem(code="MSK-01", title="МСК-01  Республика Адыгея", category="msk", status="dev"),
    CRSItem(code="MSK-02", title="МСК-02  Республика Башкортостан", category="msk", status="dev"),
    CRSItem(code="MSK-03", title="МСК-03  Республика Бурятия", category="msk", status="dev"),
    CRSItem(code="MSK-04", title="МСК-04  Республика Алтай", category="msk", status="dev"),
    CRSItem(code="MSK-05", title="МСК-05  Республика Дагестан", category="msk", status="dev"),
    CRSItem(code="MSK-06", title="МСК-06  Республика Ингушетия", category="msk", status="dev"),
    CRSItem(code="MSK-07", title="МСК-07  Кабардино-Балкарская Республика", category="msk", status="dev"),
    CRSItem(code="MSK-08", title="МСК-08  Республика Калмыкия", category="msk", status="dev"),
    CRSItem(code="MSK-09", title="МСК-09  Республика Карачаево-Черкесия", category="msk", status="dev"),
    CRSItem(code="MSK-10", title="МСК-10  Республика Карелия", category="msk", status="dev"),
    CRSItem(code="MSK-11", title="МСК-11  Республика Коми", category="msk", status="dev"),
    CRSItem(code="MSK-12", title="МСК-12  Республика Марий Эл", category="msk", status="dev"),
    CRSItem(code="MSK-13", title="МСК-13  Республика Мордовия", category="msk", status="dev"),
    CRSItem(code="MSK-14", title="МСК-14  Республика Саха (Якутия)", category="msk", status="dev"),
    CRSItem(code="MSK-15", title="МСК-15  Северная Осетия - Алания", category="msk", status="dev"),
    CRSItem(code="MSK-16", title="МСК-16  Республика Татарстан", category="msk", status="dev"),
    CRSItem(code="MSK-17", title="МСК-17  Республика Тыва", category="msk", status="dev"),
    CRSItem(code="MSK-18", title="МСК-18  Удмуртская Республика", category="msk", status="dev"),
    CRSItem(code="MSK-19", title="МСК-19  Республика Хакасия", category="msk", status="dev"),
    CRSItem(code="MSK-20", title="МСК-20  Чеченская Республика", category="msk", status="dev"),
    CRSItem(code="MSK-21", title="МСК-21  Чувашская Республика", category="msk", status="dev"),
    CRSItem(code="MSK-22", title="МСК-22  Алтайский край", category="msk", status="dev"),
    CRSItem(code="MSK-23", title="МСК-23  Краснодарский край", category="msk", status="dev"),
    CRSItem(code="MSK-24", title="МСК-24  Красноярский край", category="msk", status="dev"),
    CRSItem(code="MSK-25", title="МСК-25  Приморский край", category="msk", status="dev"),
    CRSItem(code="MSK-26", title="МСК-26  Ставропольский край", category="msk", status="dev"),
    CRSItem(code="MSK-27", title="МСК-27  Хабаровский край", category="msk", status="dev"),
    CRSItem(code="MSK-28", title="МСК-28  Амурская область", category="msk", status="dev"),
    CRSItem(code="MSK-29", title="МСК-29  Архангельская область", category="msk", status="dev"),
    CRSItem(code="MSK-30", title="МСК-30  Астраханская область", category="msk", status="dev"),
    CRSItem(code="MSK-31", title="МСК-31  Белгородская область", category="msk", status="dev"),
    CRSItem(code="MSK-32", title="МСК-32  Брянская область", category="msk", status="dev"),
    CRSItem(code="MSK-33", title="МСК-33  Владимирская область", category="msk", status="dev"),
    CRSItem(code="MSK-34", title="МСК-34  Волгоградская область", category="msk", status="dev"),
    CRSItem(code="MSK-35", title="МСК-35  Вологодская область", category="msk", status="dev"),
    CRSItem(code="MSK-36", title="МСК-36  Воронежская область", category="msk", status="dev"),
    CRSItem(code="MSK-37", title="МСК-37  Ивановская область", category="msk", status="dev"),
    CRSItem(code="MSK-38", title="МСК-38  Иркутская область", category="msk", status="dev"),
    CRSItem(code="MSK-39", title="МСК-39  Калининградская область", category="msk", status="dev"),
    CRSItem(code="MSK-40", title="МСК-40  Калужская область", category="msk", status="dev"),
    CRSItem(code="MSK-41", title="МСК-41  Камчатский край", category="msk", status="dev"),
    CRSItem(code="MSK-42", title="МСК-42  Кемеровская область", category="msk", status="dev"),
    CRSItem(code="MSK-43", title="МСК-43  Кировская область", category="msk", status="dev"),
    CRSItem(code="MSK-44", title="МСК-44  Костромская область", category="msk", status="dev"),
    CRSItem(code="MSK-45", title="МСК-45  Курганская область", category="msk", status="dev"),
    CRSItem(code="MSK-46", title="МСК-46  Курская область", category="msk", status="dev"),
    CRSItem(code="MSK-47", title="МСК-47  Ленинградская область", category="msk", status="dev"),
    CRSItem(code="MSK-48", title="МСК-48  Липецкая область", category="msk", status="dev"),
    CRSItem(code="MSK-49", title="МСК-49  Магаданская область", category="msk", status="dev"),
    CRSItem(code="MSK-50", title="МСК-50  Московская область", category="msk", status="dev"),
    CRSItem(code="MSK-51", title="МСК-51  Мурманская область", category="msk", status="dev"),
    CRSItem(code="MSK-52", title="МСК-52  Нижегородская область", category="msk", status="dev"),
    CRSItem(code="MSK-53", title="МСК-53  Новгородская область", category="msk", status="dev"),
    CRSItem(code="MSK-54", title="МСК-54  Новосибирская область", category="msk", status="dev"),
    CRSItem(code="MSK-55", title="МСК-55  Омская область", category="msk", status="dev"),
    CRSItem(code="MSK-56", title="МСК-56  Оренбургская область", category="msk", status="dev"),
    CRSItem(code="MSK-57", title="МСК-57  Орловская область", category="msk", status="dev"),
    CRSItem(code="MSK-58", title="МСК-58  Пензенская область", category="msk", status="dev"),
    CRSItem(code="MSK-59", title="МСК-59  Пермский край", category="msk", status="dev"),
    CRSItem(code="MSK-60", title="МСК-60  Псковская область", category="msk", status="dev"),
    CRSItem(code="MSK-61", title="МСК-61  Ростовская область", category="msk", status="dev"),
    CRSItem(code="MSK-62", title="МСК-62  Рязанская область", category="msk", status="dev"),
    CRSItem(code="MSK-63", title="МСК-63  Самарская область", category="msk", status="dev"),
    CRSItem(code="MSK-64", title="МСК-64  Саратовская область", category="msk", status="dev"),
    CRSItem(code="MSK-65", title="МСК-65  Сахалинская область", category="msk", status="dev"),
    CRSItem(code="MSK-66", title="МСК-66  Свердловская область", category="msk", status="dev"),
    CRSItem(code="MSK-67", title="МСК-67  Смоленская область", category="msk", status="dev"),
    CRSItem(code="MSK-68", title="МСК-68  Тамбовская область", category="msk", status="dev"),
    CRSItem(code="MSK-69", title="МСК-69  Тверская область", category="msk", status="dev"),
    CRSItem(code="MSK-70", title="МСК-70  Томская область", category="msk", status="dev"),
    CRSItem(code="MSK-71", title="МСК-71  Тульская область", category="msk", status="dev"),
    CRSItem(code="MSK-72", title="МСК-72  Тюменская область", category="msk", status="dev"),
    CRSItem(code="MSK-73", title="МСК-73  Ульяновская область", category="msk", status="dev"),
    CRSItem(code="MSK-74", title="МСК-74  Челябинская область", category="msk", status="dev"),
    CRSItem(code="MSK-75", title="МСК-75  Забайкальский край", category="msk", status="dev"),
    CRSItem(code="MSK-76", title="МСК-76  Ярославская область", category="msk", status="dev"),
    CRSItem(code="MSK-83", title="МСК-83  Ненецкий автономный округ", category="msk", status="dev"),
    CRSItem(code="MSK-86", title="МСК-86  Ханты-Мансийский автономный округ — Югра", category="msk", status="dev"),
    CRSItem(code="MSK-87", title="МСК-87  Чукотский автономный округ", category="msk", status="dev"),

    # Резерв под СК-63 (подробный список зон добавим позже)
    CRSItem(
        code="SK63:RU-XX",
        title="СК-63 (выберите регион/зону)",
        category="sk63",
        status="dev",
        region="RU-XX",
    ),
]

# ----------------------------------------------------------------------
# Внутренний движок для WGS-84 и проекций Гаусса-Крюгера (6° зоны)
# ----------------------------------------------------------------------

WGS84_CRS = CRS.from_epsg(4326)


@lru_cache(maxsize=32)
def _crs_gk_sk42_6(zone: int) -> CRS:
    """Pulkovo 1942 / Gauss-Kruger zone N, EPSG:28400+zone (зоны 2–33)."""
    if zone < 2 or zone > 33:
        raise HTTPException(
            status_code=400,
            detail=f"Зона ГК-СК-42 должна быть в диапазоне 2–33, получено: {zone}",
        )
    epsg_code = 28400 + zone
    return CRS.from_epsg(epsg_code)


@lru_cache(maxsize=32)
def _crs_gk_gsk2011_6(zone: int) -> CRS:
    """GSK-2011 / Gauss-Kruger zone N, EPSG:20900+zone (зоны 2–33)."""
    if zone < 2 or zone > 33:
        raise HTTPException(
            status_code=400,
            detail=f"Зона ГК-ГСК-2011 должна быть в диапазоне 2–33, получено: {zone}",
        )
    epsg_code = 20900 + zone
    return CRS.from_epsg(epsg_code)


@lru_cache(maxsize=32)
def _crs_gk_sk95_6(zone: int) -> CRS:
    """Pulkovo 1995 / Gauss-Kruger zone N, EPSG:20000+zone (зоны 2–33)."""
    if zone < 2 or zone > 33:
        raise HTTPException(
            status_code=400,
            detail=f"Зона ГК-СК-95 должна быть в диапазоне 2–33, получено: {zone}",
        )
    epsg_code = 20000 + zone
    return CRS.from_epsg(epsg_code)


@lru_cache(maxsize=64)
def _tr_wgs84_to_gk_sk42(zone: int) -> Transformer:
    return Transformer.from_crs(WGS84_CRS, _crs_gk_sk42_6(zone), always_xy=True)


@lru_cache(maxsize=64)
def _tr_gk_sk42_to_wgs84(zone: int) -> Transformer:
    return Transformer.from_crs(_crs_gk_sk42_6(zone), WGS84_CRS, always_xy=True)


@lru_cache(maxsize=64)
def _tr_wgs84_to_gk_gsk2011(zone: int) -> Transformer:
    return Transformer.from_crs(WGS84_CRS, _crs_gk_gsk2011_6(zone), always_xy=True)


@lru_cache(maxsize=64)
def _tr_gk_gsk2011_to_wgs84(zone: int) -> Transformer:
    return Transformer.from_crs(_crs_gk_gsk2011_6(zone), WGS84_CRS, always_xy=True)


@lru_cache(maxsize=64)
def _tr_wgs84_to_gk_sk95(zone: int) -> Transformer:
    return Transformer.from_crs(WGS84_CRS, _crs_gk_sk95_6(zone), always_xy=True)


@lru_cache(maxsize=64)
def _tr_gk_sk95_to_wgs84(zone: int) -> Transformer:
    return Transformer.from_crs(_crs_gk_sk95_6(zone), WGS84_CRS, always_xy=True)


def _detect_zone_from_lon(lon: float, opts: ConvertOptions) -> int:
    """Авто-определение 6° зоны ГК по долготе."""
    if opts.zone_mode != 6:
        raise HTTPException(
            status_code=400,
            detail="Для проекций Гаусса-Крюгера сейчас реализованы только 6° зоны. Выберите ширину зоны 6°.",
        )

    lon_norm = ((lon + 180.0) % 360.0) - 180.0
    zone = int(lon_norm // 6.0) + 1

    if zone < 1 or zone > 60:
        raise HTTPException(
            status_code=400,
            detail=f"Не удалось определить 6° зону ГК по долготе {lon}. Получена зона {zone}.",
        )

    return zone


def _detect_zone_from_x(x: float, opts: ConvertOptions) -> int:
    """
    Для 6° ГК: X ≈ ZONE * 1_000_000 + 500_000.
    Берём целую часть от деления на 1_000_000 как номер зоны.
    """
    if x <= 0:
        raise HTTPException(status_code=400, detail="Некорректное значение X (easting) для проекции Гаусса-Крюгера.")

    zone = int(x // 1_000_000)

    if zone < 1 or zone > 60:
        raise HTTPException(
            status_code=400,
            detail=f"Не удалось определить зону по X={x} для Гаусса-Крюгера (получена зона {zone}).",
        )

    return zone


# --- Обобщённые конверторы WGS-84 ⇄ любая 6° ГК-проекция ----------------


def _convert_wgs84_to_gk_generic(
    points: List[Point],
    opts: ConvertOptions,
    tr_factory,
) -> tuple[List[Point], List[int]]:
    out: List[Point] = []
    used_zones: set[int] = set()

    for p in points:
        if p.lat is None or p.lon is None:
            raise HTTPException(
                status_code=400,
                detail="Для преобразования WGS-84 → Гаусса-Крюгера нужно заполнить lat и lon.",
            )

        zone = _detect_zone_from_lon(p.lon, opts)
        used_zones.add(zone)

        tr: Transformer = tr_factory(zone)
        x, y = tr.transform(p.lon, p.lat)  # always_xy=True → (lon, lat)
        out.append(Point(x=x, y=y, name=p.name))

    return out, sorted(used_zones)


def _convert_gk_to_wgs84_generic(
    points: List[Point],
    opts: ConvertOptions,
    tr_factory,
) -> tuple[List[Point], List[int]]:
    out: List[Point] = []
    used_zones: set[int] = set()

    for p in points:
        if p.x is None or p.y is None:
            raise HTTPException(
                status_code=400,
                detail="Для проекции Гаусса-Крюгера → WGS-84 нужно заполнить X и Y.",
            )

        zone = _detect_zone_from_x(p.x, opts)
        used_zones.add(zone)

        tr: Transformer = tr_factory(zone)
        lon, lat = tr.transform(p.x, p.y)
        out.append(Point(lat=lat, lon=lon, name=p.name))

    return out, sorted(used_zones)


def _convert_wgs84_to_gk_sk42(points: List[Point], opts: ConvertOptions):
    return _convert_wgs84_to_gk_generic(points, opts, _tr_wgs84_to_gk_sk42)


def _convert_gk_sk42_to_wgs84(points: List[Point], opts: ConvertOptions):
    return _convert_gk_to_wgs84_generic(points, opts, _tr_gk_sk42_to_wgs84)


def _convert_wgs84_to_gk_gsk2011(points: List[Point], opts: ConvertOptions):
    return _convert_wgs84_to_gk_generic(points, opts, _tr_wgs84_to_gk_gsk2011)


def _convert_gk_gsk2011_to_wgs84(points: List[Point], opts: ConvertOptions):
    return _convert_gk_to_wgs84_generic(points, opts, _tr_gk_gsk2011_to_wgs84)


def _convert_wgs84_to_gk_sk95(points: List[Point], opts: ConvertOptions):
    return _convert_wgs84_to_gk_generic(points, opts, _tr_wgs84_to_gk_sk95)


def _convert_gk_sk95_to_wgs84(points: List[Point], opts: ConvertOptions):
    return _convert_gk_to_wgs84_generic(points, opts, _tr_gk_sk95_to_wgs84)


# ----------------------------------------------------------------------
# Геодезические СК ↔ геодезические СК (lat/lon в градусах)
# ----------------------------------------------------------------------

GEODETIC_EPSG = {
    "EPSG:4326": 4326,     # WGS-84
    "GSK2011_GEOG": 7683,  # ГСК-2011 (географические)
    "SK42_GEOG": 4284,     # Пулково-1942 (СК-42, географические)
    "SK95_GEOG": 4200,     # Пулково-1995 (СК-95, географические)
    "PZ90_GEOG": 4740,     # ПЗ-90 (географические)
    "PZ90_02_GEOG": 9474,  # ПЗ-90.02 (географические)
    "PZ90_11_GEOG": 9475,  # ПЗ-90.11 (географические)
}


def _convert_geodetic(req: ConvertRequest) -> List[Point]:
    if req.crs_from not in GEODETIC_EPSG:
        raise HTTPException(
            status_code=400,
            detail=f"Геодезическая СК '{req.crs_from}' не поддерживается.",
        )
    if req.crs_to not in GEODETIC_EPSG:
        raise HTTPException(
            status_code=400,
            detail=f"Геодезическая СК '{req.crs_to}' не поддерживается.",
        )

    src = CRS.from_epsg(GEODETIC_EPSG[req.crs_from])
    dst = CRS.from_epsg(GEODETIC_EPSG[req.crs_to])
    tr = Transformer.from_crs(src, dst, always_xy=True)

    out: List[Point] = []

    for p in req.points:
        if p.lat is None or p.lon is None:
            raise HTTPException(
                status_code=400,
                detail="Для преобразования между геодезическими СК нужно заполнить lat и lon.",
            )

        lon_in = float(p.lon)
        lat_in = float(p.lat)

        lon_out, lat_out = tr.transform(lon_in, lat_in)
        out.append(
            Point(
                lat=round(lat_out, 10),
                lon=round(lon_out, 10),
                name=p.name,
            )
        )

    return out


# ----------------------------------------------------------------------
# Эндпоинты API
# ----------------------------------------------------------------------


@app.get("/health")
def health():
    removed = cleanup_uploads()
    return {"status": "ok", "cleaned_files": removed}


@app.get("/crs", response_model=List[CRSItem])
def list_crs():
    return CRS_REGISTRY


@app.post("/convert", response_model=ConvertResponse)
def convert(req: ConvertRequest):
    # 1) Спец-случаи: WGS-84 ⇄ ГК-* (6° зоны)

    # WGS-84 ⇄ ГК-СК-42
    if req.crs_from == "EPSG:4326" and req.crs_to == "GK_SK42":
        points, zones = _convert_wgs84_to_gk_sk42(req.points, req.options)
        meta = {
            "engine": "pyproj EPSG:4326 → EPSG:284xx",
            "auto_zone": req.options.auto_zone,
            "zone_mode": req.options.zone_mode,
            "used_zones": zones,
        }
        return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=points, meta=meta)

    if req.crs_from == "GK_SK42" and req.crs_to == "EPSG:4326":
        points, zones = _convert_gk_sk42_to_wgs84(req.points, req.options)
        meta = {
            "engine": "pyproj EPSG:284xx → EPSG:4326",
            "auto_zone": req.options.auto_zone,
            "zone_mode": req.options.zone_mode,
            "used_zones": zones,
        }
        return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=points, meta=meta)

    # WGS-84 ⇄ ГК-ГСК-2011
    if req.crs_from == "EPSG:4326" and req.crs_to == "GK_GSK2011":
        points, zones = _convert_wgs84_to_gk_gsk2011(req.points, req.options)
        meta = {
            "engine": "pyproj EPSG:4326 → EPSG:209xx",
            "auto_zone": req.options.auto_zone,
            "zone_mode": req.options.zone_mode,
            "used_zones": zones,
        }
        return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=points, meta=meta)

    if req.crs_from == "GK_GSK2011" and req.crs_to == "EPSG:4326":
        points, zones = _convert_gk_gsk2011_to_wgs84(req.points, req.options)
        meta = {
            "engine": "pyproj EPSG:209xx → EPSG:4326",
            "auto_zone": req.options.auto_zone,
            "zone_mode": req.options.zone_mode,
            "used_zones": zones,
        }
        return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=points, meta=meta)

    # WGS-84 ⇄ ГК-СК-95
    if req.crs_from == "EPSG:4326" and req.crs_to == "GK_SK95":
        points, zones = _convert_wgs84_to_gk_sk95(req.points, req.options)
        meta = {
            "engine": "pyproj EPSG:4326 → EPSG:200xx",
            "auto_zone": req.options.auto_zone,
            "zone_mode": req.options.zone_mode,
            "used_zones": zones,
        }
        return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=points, meta=meta)

    if req.crs_from == "GK_SK95" and req.crs_to == "EPSG:4326":
        points, zones = _convert_gk_sk95_to_wgs84(req.points, req.options)
        meta = {
            "engine": "pyproj EPSG:200xx → EPSG:4326",
            "auto_zone": req.options.auto_zone,
            "zone_mode": req.options.zone_mode,
            "used_zones": zones,
        }
        return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=points, meta=meta)

    # 2) Геодезические СК → геодезические СК
    if req.crs_from in GEODETIC_EPSG and req.crs_to in GEODETIC_EPSG:
        points = _convert_geodetic(req)
        meta = {
            "engine": "pyproj geodetic → geodetic",
            "crs_from_epsg": GEODETIC_EPSG[req.crs_from],
            "crs_to_epsg": GEODETIC_EPSG[req.crs_to],
        }
        return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=points, meta=meta)

    # 3) Общий случай: только EPSG-коды, всё как раньше
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
        "note": "МСК и СК-63 пока без движка, только в реестре.",
    }

    return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=out_points, meta=meta)


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
