"""Local MSK definitions, checked separately from the source's catalogue labels."""
from .schemas import CRSItem
from .sk63_registry import CATALOG
from .regional_definitions import load_definitions, build_projection, verification_description


DEFINITIONS_BY_CODE = load_definitions('msk_definitions.json')
DEFINITIONS = list(DEFINITIONS_BY_CODE.values())
READY_MSK_CRS = {}
MSK_ITEMS = []

for system in CATALOG['msk']:
    for zone in system['zones']:
        code = f"MSK:GEOPROJ:{system['source_id']}:{zone['source_value']}"
        definition = DEFINITIONS_BY_CODE.get(code)
        description = 'Параметры преобразования МСК пока не подтверждены.'
        if definition:
            READY_MSK_CRS[code] = build_projection(definition)
            description = verification_description(definition)
        MSK_ITEMS.append(CRSItem(
            code=code, title=f"{system['title']} — зона {zone['label']}", category='msk',
            status='ready' if definition else 'dev', region=system['region_label'],
            description=description,
        ))

if set(READY_MSK_CRS) != set(DEFINITIONS_BY_CODE):
    raise ValueError('MSK definition is absent from the catalogue')
