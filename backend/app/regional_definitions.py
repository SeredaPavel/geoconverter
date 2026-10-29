"""Build regional projections without losing their geodetic reference frame."""
import json
from pathlib import Path

from pyproj import CRS
from pyproj.crs import ProjectedCRS
from pyproj.crs.coordinate_operation import TransverseMercatorConversion


REGISTRY_DIR = Path(__file__).parent / 'crs_registry'
PROJECTION_PARAMETERS = (
    'latitude_natural_origin', 'longitude_natural_origin',
    'scale_factor_natural_origin', 'false_easting', 'false_northing',
)


def load_definitions(filename):
    definitions = json.loads((REGISTRY_DIR / filename).read_text(encoding='utf-8'))['definitions']
    by_code = {definition['code']: definition for definition in definitions}
    if len(by_code) != len(definitions):
        raise ValueError(f'Duplicate regional definition code in {filename}')
    return by_code


def build_projection(definition):
    # An ellipsoid-only PROJ string has no datum transformation. Keep the named
    # base CRS, so PROJ can select an actual operation (ballpark stays disabled).
    crs = ProjectedCRS(
        name=definition['name'],
        geodetic_crs=CRS.from_epsg(definition['base_epsg']),
        conversion=TransverseMercatorConversion(**{
            key: definition[key] for key in PROJECTION_PARAMETERS
        }),
    ).to_json_dict()
    if 'bbox' in definition:
        south, west, north, east = definition['bbox']
        crs.update(area=definition['name'], bbox={
            'south_latitude': south, 'west_longitude': west,
            'north_latitude': north, 'east_longitude': east,
        })
    return CRS.from_json_dict(crs)


def verification_description(definition):
    tolerance = str(definition['verification_tolerance_metres']).replace('.', ',')
    description = (
        f"Источник определения: {definition['definition_author']}. "
        f"Сверено с geoproj.ru на {len(definition['control_points'])} контрольных точках "
        f"(допуск {tolerance} м; это не оценка точности на всей территории). "
        'X — восток, Y — север; на geoproj.ru обозначения X/Y обратные. '
        'Зону выбирайте по исходным данным; автоматическое определение границ не выполняется.'
    )
    if 'bbox' in definition:
        south, west, north, east = definition['bbox']
        description += f' Область определения: {south}–{north}° с. ш., {west}–{east}° в. д.'
    return description
