"""Local MSK definitions, checked separately from the source's catalogue labels."""
import json
from pathlib import Path

from pyproj import CRS
from pyproj.crs import ProjectedCRS
from pyproj.crs.coordinate_operation import TransverseMercatorConversion

from .schemas import CRSItem
from .sk63_registry import CATALOG


DEFINITIONS = json.loads(
    (Path(__file__).parent / 'crs_registry/msk_definitions.json').read_text(encoding='utf-8')
)['definitions']
READY_MSK_CRS = {}
MSK_ITEMS = []
DEFINITIONS_BY_CODE = {definition['code']: definition for definition in DEFINITIONS}
if len(DEFINITIONS_BY_CODE) != len(DEFINITIONS):
    raise ValueError('Duplicate MSK definition code')

for system in CATALOG['msk']:
    for zone in system['zones']:
        code = f"MSK:GEOPROJ:{system['source_id']}:{zone['source_value']}"
        definition = DEFINITIONS_BY_CODE.get(code)
        description = 'Параметры преобразования МСК пока не подтверждены.'
        if definition:
            crs = ProjectedCRS(
                name=definition['name'],
                geodetic_crs=CRS.from_epsg(definition['base_epsg']),
                conversion=TransverseMercatorConversion(**{
                    key: definition[key] for key in (
                        'latitude_natural_origin', 'longitude_natural_origin',
                        'scale_factor_natural_origin', 'false_easting', 'false_northing')
                }),
            ).to_json_dict()
            south, west, north, east = definition['bbox']
            crs.update(area=f"{system['region_label']}, зона {zone['label']}",
                       bbox={'south_latitude': south, 'west_longitude': west,
                             'north_latitude': north, 'east_longitude': east})
            READY_MSK_CRS[code] = CRS.from_json_dict(crs)
            description = (
                'Определение GIS-Lab, сверено с geoproj.ru на трёх контрольных точках '
                '(расхождение менее 0,01 м; это не оценка точности на всей территории). '
                'X — восток, Y — север; на geoproj.ru обозначения X/Y обратные. '
                f'Область определения: {south}–{north}° с. ш., {west}–{east}° в. д.'
            )
        MSK_ITEMS.append(CRSItem(
            code=code, title=f"{system['title']} — зона {zone['label']}", category='msk',
            status='ready' if definition else 'dev', region=system['region_label'],
            description=description,
        ))

if set(READY_MSK_CRS) != set(DEFINITIONS_BY_CODE):
    raise ValueError('MSK definition is absent from the catalogue')
