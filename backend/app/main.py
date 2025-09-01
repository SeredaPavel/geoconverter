# /geoconverter/backend/app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from .schemas import ConvertRequest, ConvertResponse, Point, CRSItem
from .utils import auto_zone_6, auto_zone_3
from pyproj import CRS, Transformer
import pandas as pd
import io, os, time, uuid
from pathlib import Path

app = FastAPI(title="ГеоКонвертер API", version="0.1.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
RETENTION = int(os.getenv("UPLOAD_RETENTION_SEC", "3600"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def cleanup_uploads():
    now = time.time()
    removed = 0
    for p in UPLOAD_DIR.glob("*"):
        try:
            if p.is_file() and now - p.stat().st_mtime > RETENTION:
                p.unlink(missing_ok=True)
                removed += 1
        except Exception:
            pass
    return removed

@app.on_event("startup")
def _startup_cleanup():
    cleanup_uploads()

CRS_REGISTRY: List[CRSItem] = [
    CRSItem(code="EPSG:4326", title="WGS 84 (географические)", category="geographic"),
    CRSItem(code="GSK2011_GEOG", title="ГСК-2011 (географические)", category="geographic", status="dev"),
    CRSItem(code="SK42_GEOG", title="СК-42 (географические)", category="geographic", status="dev"),
    CRSItem(code="SK95_GEOG", title="СК-95 (географические)", category="geographic", status="dev"),
    CRSItem(code="PZ90_GEOG", title="ПЗ-90 (географические)", category="geographic", status="dev"),
    CRSItem(code="MSK:RU-XX", title="МСК (выберите регион)", category="msk", status="dev", region="RU-XX"),
    CRSItem(code="SK63:RU-XX", title="СК-63 (выберите регион/зону)", category="sk63", status="dev", region="RU-XX"),
    CRSItem(code="MSK:DNR", title="МСК ДНР", category="msk", status="dev", region="DNR"),
    CRSItem(code="MSK:LNR", title="МСК ЛНР", category="msk", status="dev", region="LNR"),
    CRSItem(code="MSK:KHER", title="МСК Херсонская обл.", category="msk", status="dev", region="KHER"),
    CRSItem(code="MSK:ZAPR", title="МСК Запорожская обл.", category="msk", status="dev", region="ZAPR"),
]

@app.get("/health")
def health():
    removed = cleanup_uploads()
    return {"ok": True, "removed_old_uploads": removed}

@app.get("/crs", response_model=List[CRSItem])
def list_crs(category: str | None = None):
    data = CRS_REGISTRY
    if category:
        data = [c for c in data if c.category == category]
    return data

@app.post("/convert", response_model=ConvertResponse)
def convert(req: ConvertRequest):
    def resolve_crs(code: str) -> CRS:
        if code.startswith("EPSG:"):
            return CRS.from_user_input(code)
        raise HTTPException(status_code=400, detail=f"CRS '{code}' пока не сконфигурирован (в разработке).")

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
            raise HTTPException(status_code=400, detail="Точка должна содержать пару lat/lon или x/y.")

    meta = {
        "auto_zone": req.options.auto_zone,
        "zone_mode": req.options.zone_mode,
        "note": "Полные трансформации ГСК-2011/СК-42/СК-95/МСК будут после подключения гридов.",
    }
    return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=out_points, meta=meta)

@app.post("/import")
async def import_excel(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 1_000_000:
        raise HTTPException(status_code=400, detail="Файл больше 1 МБ. Сократите размер.")

    fid = f"{int(time.time())}_{uuid.uuid4().hex}.xlsx"
    path = UPLOAD_DIR / fid
    path.write_bytes(content)

    cleanup_uploads()

    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        try: path.unlink(missing_ok=True)
        except Exception: pass
        raise HTTPException(status_code=400, detail=f"Не удалось прочитать Excel: {e}")

    if df.shape[1] != 2:
        try: path.unlink(missing_ok=True)
        except Exception: pass
        raise HTTPException(status_code=400, detail="В файле должно быть ровно 2 колонки (Lat/Lon или X/Y).")

    head = df.head(10).to_dict(orient="records")
    return {"rows_preview": head, "rows_total": int(df.shape[0]), "file_id": fid, "kept_seconds": RETENTION}
