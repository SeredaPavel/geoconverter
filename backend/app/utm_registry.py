"""WGS84 UTM: registered EPSG definitions, explicitly checked before use."""
import math
from functools import lru_cache

from fastapi import HTTPException
from pyproj import CRS


CRS_CODE = 'UTM_WGS84'
ZONES = list(range(1, 61))
EPSG_CODES = {(zone, hemisphere): base + zone
              for hemisphere, base in [('N', 32600), ('S', 32700)] for zone in ZONES}


@lru_cache(maxsize=120)
def get_crs(zone, hemisphere):
    if (zone, hemisphere) not in EPSG_CODES:
        raise HTTPException(status_code=400, detail='UTM: выберите зону 1–60 и северное или южное полушарие.')
    crs = CRS.from_epsg(EPSG_CODES[(zone, hemisphere)])
    expected = {'8801': 0, '8802': zone * 6 - 183, '8805': .9996,
                '8806': 500000, '8807': 0 if hemisphere == 'N' else 10000000}
    operation = crs.coordinate_operation
    actual = {p.code: p.value for p in operation.params}
    if (crs.geodetic_crs.to_epsg() != 4326 or crs.utm_zone != f'{zone}{hemisphere}'
            or operation.method_code != '9807' or set(actual) != set(expected)
            or any(not math.isclose(actual[k], v, rel_tol=0, abs_tol=1e-9) for k, v in expected.items())):
        raise ValueError(f'Unexpected UTM definition: {zone}{hemisphere}')
    return crs


def require_settings(settings, side):
    if settings is None:
        label = 'исходной' if side == 'source' else 'целевой'
        raise HTTPException(status_code=400, detail=f'Для {label} UTM укажите номер зоны и полушарие.')
    return get_crs(settings.zone, settings.hemisphere)


def check_latitude(latitude, hemisphere, row):
    tolerance = 1e-8  # Floating point noise at the equator and latitude limits.
    if latitude < -80 - tolerance or latitude > 84 + tolerance:
        raise HTTPException(status_code=400, detail=f'Строка {row}: UTM применяется от 80° ю. ш. до 84° с. ш.')
    if (hemisphere == 'N' and latitude < -tolerance) or (hemisphere == 'S' and latitude > tolerance):
        raise HTTPException(status_code=400, detail=f'Строка {row}: полушарие UTM не соответствует широте точки.')


def export_label(code, settings, side):
    if code != CRS_CODE:
        return code
    crs = require_settings(settings, side)
    hemisphere = 'северное' if settings.hemisphere == 'N' else 'южное'
    return f'WGS-84 / UTM, зона {settings.zone}, {hemisphere} полушарие (EPSG:{crs.to_epsg()})'
