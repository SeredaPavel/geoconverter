"""Compatibility helpers; use the verified GK registry for zone numbering."""
from .gk_registry import longitude_zone


def auto_zone_6(longitude: float) -> int:
    return longitude_zone('GK_SK42', 6, longitude)


def auto_zone_3(longitude: float) -> int:
    return longitude_zone('GK_SK42', 3, longitude)
