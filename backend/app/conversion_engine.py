"""One conversion path for geographic, zoned GK and verified regional CRS."""
import math
from functools import lru_cache

from fastapi import HTTPException
from pyproj import CRS, Transformer
from pyproj.exceptions import ProjError

from .gk_registry import FAMILIES, EPSG_ZONES, check_zone, easting_zone, longitude_zone, get_crs
from .msk_registry import READY_MSK_CRS, MSK_ITEMS
from .sk63_registry import READY_CRS, SK63_ITEMS
from .schemas import ConvertRequest, ConvertResponse, GKOptions, Point
from .reference_frames import ANCHOR, PZ_FRAMES, frame_code, to_anchor


GEODETIC_EPSG = {'EPSG:4326': 4326, 'GSK2011_GEOG': 7683, 'SK42_GEOG': 4284,
                'SK95_GEOG': 4200, 'PZ90_GEOG': 4740, 'PZ90_02_GEOG': 9474, 'PZ90_11_GEOG': 9475}
REGIONAL_CRS = {**READY_CRS, **READY_MSK_CRS}
REGIONAL_ITEMS = {i.code: i for i in [*MSK_ITEMS, *SK63_ITEMS]}


@lru_cache(maxsize=512)
def strict_transformer(source, target):
    return Transformer.from_crs(source, target, always_xy=True, allow_ballpark=False)


def transform(source, target, first, second):
    source_frame, target_frame = frame_code(source), frame_code(target)
    frame_operations = []
    fixed_frames = (source_frame in PZ_FRAMES or target_frame in PZ_FRAMES) and source != target
    source_actual, target_actual = source, target
    height = 0
    if fixed_frames and source_frame in PZ_FRAMES:
        pipeline, descriptions = to_anchor(source_frame)
        first, second, height = pipeline.transform(first, second, height, errcheck=True)
        frame_operations.extend(descriptions)
        source_actual = ANCHOR
    if fixed_frames and target_frame in PZ_FRAMES:
        target_actual = ANCHOR
    tr = strict_transformer(source_actual.srs, target_actual.srs)
    if fixed_frames:
        x, y, height = tr.transform(first, second, height, errcheck=True)
    else:
        x, y = tr.transform(first, second, errcheck=True)
    if fixed_frames and target_frame in PZ_FRAMES:
        pipeline, descriptions = to_anchor(target_frame)
        x, y, height = pipeline.transform(x, y, height, direction='INVERSE', errcheck=True)
        frame_operations.extend([{**d, 'inverse': not d['inverse']} for d in reversed(descriptions)])
    if not math.isfinite(x) or not math.isfinite(y):
        raise HTTPException(status_code=400, detail='Преобразование не дало конечных координат.')
    try:
        operation = tr.get_last_used_operation()
    except ProjError:
        operation = tr
    metadata = {'source': source.srs, 'target': target.srs,
        'description': operation.description,
        'accuracy_metres': operation.accuracy if operation.accuracy >= 0 else None}
    if fixed_frames:
        metadata.update(description='Переход через ГСК-2011 на фиксированных параметрах EPSG',
            accuracy_metres=None, frame_operations=frame_operations,
            coordinate_epoch_modelled=False, assumed_input_height_metres=0)
    return x, y, metadata


def resolve_static(code):
    if code in FAMILIES:
        return None
    if code in REGIONAL_CRS:
        return REGIONAL_CRS[code]
    if code in REGIONAL_ITEMS or code.startswith(('MSK:', 'SK63:', 'MSK-')):
        title = REGIONAL_ITEMS[code].title if code in REGIONAL_ITEMS else code
        raise HTTPException(status_code=400, detail=f'{title}: система в разработке или код неизвестен.')
    if code in GEODETIC_EPSG:
        return CRS.from_epsg(GEODETIC_EPSG[code])
    if code.startswith('EPSG:'):
        # The pinned registry also resolves newer EPSG records on older PROJ.
        known = EPSG_ZONES.get(int(code[5:])) if code[5:].isdigit() else None
        crs = get_crs(*known) if known else CRS.from_user_input(code)
        if crs.is_geographic or crs.is_projected:
            return crs
        raise HTTPException(status_code=400, detail='Поддерживаются двумерные географические и плоские координаты.')
    raise HTTPException(status_code=400, detail=f"CRS '{code}' не сконфигурирован.")


def side_settings(options, side):
    explicit = options.source_gk if side == 'source' else options.target_gk
    return explicit if explicit is not None else GKOptions(
        auto_zone=options.auto_zone, zone_mode=options.zone_mode, zone=options.zone)


def validate_settings(code, settings):
    if code in FAMILIES and not settings.auto_zone:
        if settings.zone is None:
            raise HTTPException(status_code=400, detail=f'{code}: укажите номер зоны ГК.')
        check_zone(code, settings.zone_mode, settings.zone)


def convert_numeric(req: ConvertRequest):
    source_settings = side_settings(req.options, 'source')
    target_settings = side_settings(req.options, 'target')
    validate_settings(req.crs_from, source_settings)
    validate_settings(req.crs_to, target_settings)
    source_zones, target_zones = set(), set()
    out, operations = [], {}
    index = 0
    try:
        source_static, target_static = resolve_static(req.crs_from), resolve_static(req.crs_to)
        for index, point in enumerate(req.points, start=1):
            source = source_static
            if req.crs_from in FAMILIES:
                if point.x is None:
                    raise HTTPException(status_code=400, detail=f'Строка {index}: заполните X и Y исходной проекции.')
                zone = (easting_zone(req.crs_from, source_settings.zone_mode, point.x)
                        if source_settings.auto_zone else source_settings.zone)
                source_zones.add(zone)
                source = get_crs(req.crs_from, source_settings.zone_mode, zone)
            first, second = (point.lon, point.lat) if source.is_geographic else (point.x, point.y)
            if first is None or second is None:
                raise HTTPException(status_code=400,
                    detail=f'Строка {index}: заполните lat/lon или X/Y согласно исходной СК.')
            target = target_static
            if req.crs_to in FAMILIES:
                if target_settings.auto_zone:
                    base = CRS.from_epsg(FAMILIES[req.crs_to]['base_epsg'])
                    lon, _, _ = transform(source, base, first, second)
                    zone = longitude_zone(req.crs_to, target_settings.zone_mode, lon)
                else:
                    zone = target_settings.zone
                target_zones.add(zone)
                target = get_crs(req.crs_to, target_settings.zone_mode, zone)
            x, y, operation = transform(source, target, first, second)
            operations[(source.srs, target.srs, operation['description'])] = operation
            out.append(Point(lat=y, lon=x, name=point.name) if target.is_geographic
                       else Point(x=x, y=y, name=point.name))
    except ProjError as error:
        prefix = f'Строка {index}: ' if index else ''
        raise HTTPException(status_code=400, detail=prefix +
            f'Нет доступного подтверждённого перехода. Проверьте СК, область применения и ресурсы PROJ: {error}') from error
    return ConvertResponse(crs_from=req.crs_from, crs_to=req.crs_to, points=out, meta={
        'engine': 'pyproj unified CRS', 'axis_order': 'x=easting, y=northing', 'allow_ballpark': False,
        'auto_zone': req.options.auto_zone, 'zone_mode': req.options.zone_mode,
        'source_gk': source_settings.model_dump() if req.crs_from in FAMILIES else None,
        'target_gk': target_settings.model_dump() if req.crs_to in FAMILIES else None,
        'source_used_zones': sorted(source_zones), 'target_used_zones': sorted(target_zones),
        'used_zones': sorted(source_zones | target_zones), 'operations': list(operations.values()),
        'assumptions': ['Переход ПЗ-90.02/ПЗ-90.11 выполнен на фиксированных параметрах EPSG; '
                        'высота принята равной 0 м, изменение координат со временем не моделируется.']
            if any('frame_operations' in op for op in operations.values()) else [],
        'regional_definitions': [{'code': code, 'description': REGIONAL_ITEMS[code].description}
            for code in dict.fromkeys([req.crs_from, req.crs_to]) if code in REGIONAL_ITEMS],
    })
