# /geoconverter/backend/app/utils.py
from math import floor

def auto_zone_6(longitude: float) -> int:
    return int(floor((longitude + 180) / 6) + 1)

def auto_zone_3(longitude: float) -> int:
    return int(floor((longitude + 180) / 3) + 1)
