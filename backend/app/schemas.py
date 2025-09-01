# /geoconverter/backend/app/schemas.py
from pydantic import BaseModel, Field
from typing import List, Literal, Optional

Format = Literal["deg_dec", "deg_min", "deg_min_sec"]

class Point(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    x: Optional[float] = None
    y: Optional[float] = None
    name: Optional[str] = None

class ConvertOptions(BaseModel):
    auto_zone: bool = True
    zone_mode: Literal[3, 6] = 6
    msk_code: Optional[str] = None

class ConvertRequest(BaseModel):
    crs_from: str = Field(..., description="Напр. 'EPSG:4326'")
    crs_to: str
    format_in: Optional[Format] = "deg_dec"
    format_out: Optional[Format] = "deg_dec"
    points: List[Point]
    options: ConvertOptions = ConvertOptions()

class ConvertResponse(BaseModel):
    crs_from: str
    crs_to: str
    points: List[Point]
    meta: dict

class CRSItem(BaseModel):
    code: str
    title: str
    category: Literal["geographic", "projected", "msk", "sk63"]
    status: Literal["ready", "dev"] = "ready"
    region: Optional[str] = None
