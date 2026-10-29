# /geoconverter/backend/app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse  # ← ДОБАВЛЕНО
from typing import List

from pydantic import BaseModel  # ← ДОБАВЛЕНО

from .schemas import (
    ConvertRequest,
    ConvertResponse,
    Point,
    CRSItem,
    Format,            # ← ДОБАВЛЕНО
)
from .export_utils import (                  # ← ДОБАВЛЕНО
    build_catalog_xlsx,
    build_statement_xlsx,
)

from .sk63_registry import SK63_ITEMS
from .msk_registry import MSK_ITEMS
from .conversion_engine import convert_numeric as _convert_numeric
from .gk_registry import supported_zones
import pandas as pd
import io
import os
import time
import uuid
import math
import re
from .angles import format_angle
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
IMPORT_ROW_LIMIT = 100
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

    # Проекция Гаусса-Крюгера (3° и 6° зоны)
    CRSItem(
        code="GK_GSK2011",
        title="ГК-ГСК-2011 (зоны 3° и 6°)",
        gk_zones=supported_zones("GK_GSK2011"),
        category="projected",
        status="ready",
    ),
    CRSItem(
        code="GK_SK42",
        title="ГК-СК-42 (зоны 3° и 6°)",
        gk_zones=supported_zones("GK_SK42"),
        category="projected",
        status="ready",
    ),
    CRSItem(
        code="GK_SK95",
        title="ГК-СК-95 (зоны 3° и 6°)",
        gk_zones=supported_zones("GK_SK95"),
        category="projected",
        status="ready",
    ),

    # Старые записи МСК ниже заменяются зональным реестром MSK_ITEMS.
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
# Объединённый реестр географических и плоских систем координат
# ----------------------------------------------------------------------

CRS_REGISTRY = [item for item in CRS_REGISTRY if item.category not in {'sk63', 'msk'}] + MSK_ITEMS + SK63_ITEMS


class ExportRequest(BaseModel):
    crs_from: str
    crs_to: str
    format: Format | None = "deg_dec"
    format_in: Format | None = "deg_dec"
    format_out: Format | None = None
    rows_in: List[Point]
    rows_out: List[Point]


# ----------------------------------------------------------------------
# Эндпоинты API (основные)
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
    result = _convert_numeric(req)
    result.meta["format_out"] = req.format_out
    result.meta["formatted_points"] = [
        {"lat": format_angle(p.lat, req.format_out), "lon": format_angle(p.lon, req.format_out)}
        if p.lat is not None else {"x": p.x, "y": p.y}
        for p in result.points
    ]
    return result


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

    # Prefer labelled axes, including files whose columns are in reverse order.
    labels = {re.sub(r"\s*\(.*\)\s*$", "", str(c)).strip().lower(): c for c in df.columns}
    for first_names, second_names in ((["x", "х"], ["y", "у"]),
                                       (["lat", "широта"], ["lon", "долгота"])):
        first = next((labels[n] for n in first_names if n in labels), None)
        second = next((labels[n] for n in second_names if n in labels), None)
        if first is not None and second is not None:
            df = df[[first, second]]
            break
    df.columns = [str(c) for c in df.columns]
    head = df.head(IMPORT_ROW_LIMIT).to_dict(orient="records")
    return {
        "rows_preview": head,
        "columns": list(df.columns),
        "rows_total": int(df.shape[0]),
        "rows_limit": IMPORT_ROW_LIMIT,
        "file_id": fid,
        "kept_seconds": RETENTION,
    }


@app.post("/export/{kind}")
def export(kind: str, req: ExportRequest):
    """
    Выгрузка результатов в XLSX.

    kind:
      - 'catalog'   → каталог координат
      - 'statement' → ведомость пересчёта
    """
    if kind not in {"catalog", "statement"}:
        raise HTTPException(status_code=400, detail="Неизвестный тип выгрузки")

    if not req.rows_out:
        raise HTTPException(status_code=400, detail="Нет данных для выгрузки")

    if kind == "catalog":
        data = build_catalog_xlsx(
            rows=req.rows_out,
            crs_from=req.crs_from,
            crs_to=req.crs_to,
            format_out=req.format_out or req.format,
        )
        filename = "catalog.xlsx"
    else:
        data = build_statement_xlsx(
            rows_in=req.rows_in,
            rows_out=req.rows_out,
            crs_from=req.crs_from,
            crs_to=req.crs_to,
            format_in=req.format_in,
            format_out=req.format_out or req.format,
        )
        filename = "statement.xlsx"

    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ----------------------------------------------------------------------
# Алиасы с префиксом /api для работы через прокси (Caddy, прод)
# ----------------------------------------------------------------------


@app.get("/api/health")
def api_health():
    return health()


@app.get("/api/crs", response_model=List[CRSItem])
def api_list_crs():
    return list_crs()


@app.post("/api/convert", response_model=ConvertResponse)
def api_convert(req: ConvertRequest):
    return convert(req)


@app.post("/api/import")
async def api_import(file: UploadFile = File(...)):
    return await import_excel(file)


@app.post("/api/export/{kind}")
def api_export(kind: str, req: ExportRequest):
    return export(kind, req)
