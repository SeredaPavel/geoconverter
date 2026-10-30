"""Local MSK definitions, checked separately from the source's catalogue labels."""
from .schemas import CRSItem
from .sk63_registry import CATALOG
from .regional_definitions import load_definitions, build_projection
from .crs_help import msk_help


DEFINITIONS_BY_CODE = load_definitions('msk_definitions.json')
ADDITIONAL_DEFINITIONS = load_definitions('additional_msk_definitions.json')
if set(DEFINITIONS_BY_CODE) & set(ADDITIONAL_DEFINITIONS):
    raise ValueError('Duplicate MSK code across catalogues')
DEFINITIONS_BY_CODE.update(ADDITIONAL_DEFINITIONS)
DEFINITIONS = list(DEFINITIONS_BY_CODE.values())
READY_MSK_CRS = {}
MSK_ITEMS = []

for system in CATALOG['msk']:
    for zone in system['zones']:
        code = f"MSK:GEOPROJ:{system['source_id']}:{zone['source_value']}"
        definition = DEFINITIONS_BY_CODE.get(code)
        description = msk_help(system, zone, definition is not None)
        if definition:
            READY_MSK_CRS[code] = build_projection(definition)
        MSK_ITEMS.append(CRSItem(
            code=code, title=(definition.get('display_title') if definition else None)
                or f"{system['title']} — зона {zone['label']}", category='msk',
            status='ready' if definition else 'dev', region=system['region_label'],
            description=description,
        ))

for code, definition in ADDITIONAL_DEFINITIONS.items():
    READY_MSK_CRS[code] = build_projection(definition)
    MSK_ITEMS.append(CRSItem(
        code=code, title=definition['title'], category='msk', status='ready',
        region=definition['region'],
        description=msk_help(
            {'source_id': '36', 'region_label': definition['region'], 'zone_width_degrees': 3},
            {'label': code.rsplit(':', 1)[1]}, True),
    ))

# Published descriptions of these systems do not yet identify an unambiguous
# verified variant. Keep them visible without inventing zone numbers or aliases.
for region, title in [('17', 'Республика Тыва'), ('19', 'Республика Хакасия')]:
    MSK_ITEMS.append(CRSItem(
        code=f'MSK:{region}:UNVERIFIED', title=f'МСК-{region} {title}',
        category='msk', status='dev', region=title,
        description=f'Регион: {title}. Варианты системы и параметры перехода ещё уточняются. '
                    'Пересчёт пока недоступен.',
    ))

# GeoBridge distinguishes its tile corrections from the SK-1964 projection.
# No verified reversible definition is available here: never alias the two.
MSK_ITEMS.append(CRSItem(
    code='MSK:GEOBRIDGE:78:1', title='МСК-78 Санкт-Петербург (местные поправки)',
    category='msk', status='dev', region='Санкт-Петербург',
    description='Вариант системы Санкт-Петербурга с поправками для отдельных участков карты. '
                'Поправки и границы их применения ещё уточняются. Пересчёт пока недоступен.',
))

if set(READY_MSK_CRS) != set(DEFINITIONS_BY_CODE):
    raise ValueError('MSK definition is absent from the catalogue')
