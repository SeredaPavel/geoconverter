"""Runtime CRS choices are distinct from unverified labels in research sources."""
import json
import math
from pathlib import Path

from pyproj import CRS
from .schemas import CRSItem

CATALOG = json.loads((Path(__file__).parent / 'crs_registry/geoproj_catalog.reference.json').read_text(encoding='utf-8'))
APPROVED_EPSG = {2935, 2936, 2937, 2938, 2939, 2940, 2941, 3350, 3351, 3352, 7825, 7826, 7827, 7828, 7829, 7830, 7831}
READY_CRS = {}
SK63_ITEMS = []

for definition in CATALOG['sk63_authority_definitions']:
    epsg = int(definition['id'].split(':')[1])
    if epsg not in APPROVED_EPSG:
        continue
    crs = CRS.from_epsg(epsg)
    actual = crs.to_json_dict()
    assert actual['base_crs']['id'] == definition['base_crs']
    assert actual['conversion']['method']['id']['code'] == 9807
    expected = {p['id']['code']: p for p in definition['parameters']}
    assert len(expected) == len(actual['conversion']['parameters']) == 5
    for parameter in actual['conversion']['parameters']:
        original = expected[parameter['id']['code']]
        assert parameter['unit'] == original['unit']
        assert math.isclose(parameter['value'], original['value'], rel_tol=0, abs_tol=1e-9)
    code = f'SK63:EPSG:{epsg}'
    READY_CRS[code] = crs
    SK63_ITEMS.append(CRSItem(code=code,
        title=f"СК-63 район {definition['district']}, зона {definition['zone_number']} — EPSG:{epsg}",
        category='sk63', status='ready', region=definition['district'],
        description=f"Определение EPSG. Область применения: {definition['area_of_use']['description']}. X — восток, Y — север. Точность перехода зависит от исходной СК."))

# Keep source labels separate: matching letters/numbers alone does not prove
# that a geoproj variant is the same CRS (particularly district C).
for system in CATALOG['sk63']:
    for zone in system['zones']:
        SK63_ITEMS.append(CRSItem(
            code=f"SK63:GEOPROJ:{system['source_id']}:{zone['source_value']}",
            title=f"СК-63 район {system['district']}, зона {zone['label']} ({system['zone_width_degrees']}°), каталог geoproj",
            category='sk63', status='dev', region=system['district'],
            description='Параметры или соответствие определению EPSG ещё не подтверждены. Для расчёта выберите доступную запись EPSG.'))
for district in CATALOG['sk63_district_inventory']:
    if not district['geoproj_variant_ids'] and not district['authority_definition_ids']:
        SK63_ITEMS.append(CRSItem(code=f"SK63:DISTRICT:{district['district']}",
            title=f"СК-63 район {district['district']} — зоны уточняются", category='sk63', status='dev',
            region=district['district'], description='Определения зон пока не найдены.'))

ITEMS_BY_CODE = {item.code: item for item in SK63_ITEMS}
assert len(READY_CRS) == len(APPROVED_EPSG)

MSK_ITEMS = [CRSItem(code=f"MSK:GEOPROJ:{system['source_id']}:{zone['source_value']}",
    title=f"{system['title']} — зона {zone['label']}", category='msk', status='dev',
    region=system['region_label'], description='Параметры преобразования МСК пока не подтверждены.')
    for system in CATALOG['msk'] for zone in system['zones']]
