"""Explicit Gauss-Kruger definitions; EPSG identifiers are never inferred."""
import json
import math
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException
from pyproj import CRS
from pyproj.exceptions import CRSError
from pyproj.crs import ProjectedCRS
from pyproj.crs.coordinate_operation import TransverseMercatorConversion


MANIFEST = json.loads((Path(__file__).parent / 'crs_registry/gk_definitions.json').read_text(encoding='utf-8'))
FAMILIES = MANIFEST['families']
EPSG_ZONES = {epsg: (code, int(width), int(zone))
              for code, definition in FAMILIES.items()
              for width, zones in definition['epsg_zones'].items() for zone, epsg in zones.items()}


def supported_zones(code):
    result = {int(width): sorted(map(int, zones)) for width, zones in FAMILIES[code]['epsg_zones'].items()}
    return result


def check_zone(code, width, zone):
    zones = supported_zones(code).get(width, [])
    if zone not in zones:
        limits = f'{zones[0]}–{zones[-1]}' if zones else 'нет'
        raise HTTPException(status_code=400,
            detail=f'{code}: для зон {width}° допустимые номера {limits}; получено {zone}.')
    return zone


def longitude_zone(code, width, longitude):
    # Unroll eastern Russia across 180 degrees: -177 degrees is 183 degrees E.
    east = longitude % 360
    zone = math.floor(east / 6) + 1 if width == 6 else math.floor((east + 1.5) / 3)
    return check_zone(code, width, zone)


def easting_zone(code, width, easting):
    if not math.isfinite(easting) or easting <= 0:
        raise HTTPException(status_code=400, detail='Для авто-зоны ГК нужен X — восток с миллионным префиксом зоны.')
    return check_zone(code, width, math.floor(easting / 1_000_000))


@lru_cache(maxsize=512)
def get_crs(code, width, zone):
    check_zone(code, width, zone)
    definition = FAMILIES[code]
    epsg = definition['epsg_zones'][str(width)].get(str(zone))
    longitude = zone * width - (3 if width == 6 else 0)
    longitude = (longitude + 180) % 360 - 180
    if longitude == -180:
        longitude = 180
    newer = MANIFEST['gsk2011_3_degree']['definitions'].get(str(zone)) if code == 'GK_GSK2011' and width == 3 else None
    try:
        crs = CRS.from_epsg(epsg)
    except CRSError:
        if newer is None:
            raise
        # Backport published EPSG definitions without changing the system PROJ
        # database. Parameters and real IDs are verified against pinned upstream SQL.
        params = newer['parameters']
        projected = ProjectedCRS(name=newer['name'],
            geodetic_crs=CRS.from_epsg(definition['base_epsg']),
            # EPSG:4530 is shared with the registered six-degree GSK zones.
            cartesian_cs=CRS.from_epsg(20907).coordinate_system,
            conversion=TransverseMercatorConversion(latitude_natural_origin=params['8801'],
                longitude_natural_origin=params['8802'], scale_factor_natural_origin=params['8805'],
                false_easting=params['8806'], false_northing=params['8807']))
        document = projected.to_json_dict()
        document['id'] = {'authority': 'EPSG', 'code': newer['epsg']}
        document['conversion']['id'] = {'authority': 'EPSG', 'code': newer['conversion_epsg']}
        document['conversion']['name'] = newer['conversion_name']
        crs = CRS.from_json_dict(document)
    expected = {'8801': 0, '8802': longitude, '8805': 1,
                '8806': zone * 1_000_000 + (250_000 if newer else 500_000), '8807': 0}
    if not crs.is_projected or crs.geodetic_crs.to_epsg() != definition['base_epsg']:
        raise ValueError(f'Unexpected base CRS for {code}/{width}/{zone}')
    operation = crs.coordinate_operation
    actual = {p.code: p.value for p in operation.params}
    if operation.method_code != '9807' or set(actual) != set(expected):
        raise ValueError(f'Unexpected projection method for {code}/{width}/{zone}')
    if any(not math.isclose(actual[key], value, rel_tol=0, abs_tol=1e-8) for key, value in expected.items()):
        raise ValueError(f'Unexpected projection parameters for {code}/{width}/{zone}')
    return crs
