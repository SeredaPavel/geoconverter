# /geoconverter/backend/app/schemas.py
from pydantic import BaseModel, Field, field_validator
from .angles import parse_angle
from typing import List, Literal, Optional

Format = Literal["deg_dec", "deg_min", "deg_min_sec"]

class Point(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    x: Optional[float] = Field(default=None, allow_inf_nan=False)
    y: Optional[float] = Field(default=None, allow_inf_nan=False)
    name: Optional[str] = None

    @field_validator("lat", "lon", mode="before")
    @classmethod
    def parse_coordinates(cls, value, info):
        if value is None:
            return None
        return parse_angle(value, 90 if info.field_name == "lat" else 180)

class GKOptions(BaseModel):
    auto_zone: bool = True
    zone_mode: Literal[3, 6] = 6
    zone: Optional[int] = Field(default=None, ge=1, le=120)

class UTMOptions(BaseModel):
    zone: int = Field(..., ge=1, le=60, strict=True)
    hemisphere: Literal['N', 'S']

class ConvertOptions(GKOptions):
    # Legacy flat options remain valid; explicit side settings take precedence.
    source_gk: Optional[GKOptions] = None
    target_gk: Optional[GKOptions] = None
    source_utm: Optional[UTMOptions] = None
    target_utm: Optional[UTMOptions] = None
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
    description: Optional[str] = None
    gk_zones: Optional[dict[int, List[int]]] = None
    utm_zones: Optional[List[int]] = None
