"""Runtime CRS choices are distinct from unverified labels in research sources."""
import json
import math
from pathlib import Path

from pyproj import CRS
from .schemas import CRSItem
from .regional_definitions import load_definitions, build_projection
from .crs_help import sk63_help

CATALOG = json.loads((Path(__file__).parent / 'crs_registry/geoproj_catalog.reference.json').read_text(encoding='utf-8'))
APPROVED_EPSG = {2935, 2936, 2937, 2938, 2939, 2940, 2941, 3350, 3351, 3352, 7825, 7826, 7827, 7828, 7829, 7830, 7831}
READY_CRS = {}
SK63_ITEMS = []
VERIFIED_DEFINITIONS = load_definitions('sk63_definitions.json')

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
        description=sk63_help(definition['district'], definition['zone_number'])))

# Only explicit, independently checked records can enable a catalogue label.
# In particular, paper C1 and geoproj C1 use different numbering conventions.
for system in CATALOG['sk63']:
    for zone in system['zones']:
        code = f"SK63:GEOPROJ:{system['source_id']}:{zone['source_value']}"
        definition = VERIFIED_DEFINITIONS.get(code)
        description = sk63_help(system['district'], zone['label'], system['zone_width_degrees'])
        if definition:
            READY_CRS[code] = (CRS.from_epsg(definition['epsg']) if 'epsg' in definition
                               else build_projection(definition))
        SK63_ITEMS.append(CRSItem(
            code=code,
            title=f"СК-63 район {system['district']}, зона {zone['label']} ({system['zone_width_degrees']}°)",
            category='sk63', status='ready' if definition else 'dev', region=system['district'],
            description=description))
for district in CATALOG['sk63_district_inventory']:
    if not district['geoproj_variant_ids'] and not district['authority_definition_ids']:
        SK63_ITEMS.append(CRSItem(code=f"SK63:DISTRICT:{district['district']}",
            title=f"СК-63 район {district['district']} — зоны уточняются", category='sk63', status='dev',
            region=district['district'], description=f"СК-63, район {district['district']}. Перечень зон и их параметры ещё уточняются. Пересчёт пока недоступен."))

ITEMS_BY_CODE = {item.code: item for item in SK63_ITEMS}
if set(READY_CRS) != {f'SK63:EPSG:{epsg}' for epsg in APPROVED_EPSG} | set(VERIFIED_DEFINITIONS):
    raise ValueError('SK63 definition is absent from the catalogue')
