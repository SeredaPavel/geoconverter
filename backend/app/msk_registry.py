"""Local MSK definitions, checked separately from the source's catalogue labels."""
from .schemas import CRSItem
from .sk63_registry import CATALOG
from .regional_definitions import load_definitions, load_pending_notes, build_projection, verification_description


DEFINITIONS_BY_CODE = load_definitions('msk_definitions.json')
DEFINITIONS = list(DEFINITIONS_BY_CODE.values())
PENDING_NOTES = load_pending_notes('msk_definitions.json')
READY_MSK_CRS = {}
MSK_ITEMS = []

for system in CATALOG['msk']:
    for zone in system['zones']:
        code = f"MSK:GEOPROJ:{system['source_id']}:{zone['source_value']}"
        definition = DEFINITIONS_BY_CODE.get(code)
        description = PENDING_NOTES.get(code, 'Параметры преобразования МСК пока не подтверждены.')
        if definition:
            READY_MSK_CRS[code] = build_projection(definition)
            description = verification_description(definition)
        MSK_ITEMS.append(CRSItem(
            code=code, title=(definition.get('display_title') if definition else None)
                or f"{system['title']} — зона {zone['label']}", category='msk',
            status='ready' if definition else 'dev', region=system['region_label'],
            description=description,
        ))

# GeoBridge distinguishes its tile corrections from the SK-1964 projection.
# No verified reversible definition is available here: never alias the two.
MSK_ITEMS.append(CRSItem(
    code='MSK:GEOBRIDGE:78:1', title='МСК-78 Санкт-Петербург (поправки GeoBridge)',
    category='msk', status='dev', region='Санкт-Петербург',
    description='Отдельный вариант GeoBridge с поправками по планшетам к МСК-1964. '
                'Переходы и границы применения поправок ещё не проверены; это не синоним МСК-1964.',
))

if set(READY_MSK_CRS) != set(DEFINITIONS_BY_CODE):
    raise ValueError('MSK definition is absent from the catalogue')
