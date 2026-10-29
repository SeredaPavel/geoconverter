"""Fixed-reference-epoch PZ/GSK transforms unsupported by PROJ's method 1066.

This is the explicit 2D/static interpretation of published EPSG parameters,
not a coordinate-epoch propagation or a survey-height transformation.
"""
from functools import lru_cache

from pyproj import CRS, Transformer
from pyproj.crs import CoordinateOperation


PZ_FRAMES = {9474: [(7703, False), (7705, True)], 9475: [(7705, True)]}
ANCHOR = CRS.from_epsg(7683)


def frame_code(crs):
    return crs.to_2d().to_epsg() if crs.is_geographic and not crs.is_bound else None


def _cart(crs):
    ellipsoid = crs.ellipsoid
    return f'proj=cart a={ellipsoid.semi_major_metre} rf={ellipsoid.inverse_flattening}'


def _helmert(code, inverse):
    op = CoordinateOperation.from_epsg(code)
    if op.method_code != '1066':
        raise ValueError(f'Unexpected method for EPSG:{code}')
    parameters = {p.name: p for p in op.params}
    parts = ['inv' if inverse else '', 'proj=helmert', 'convention=coordinate_frame']
    for name, key, unit, factor in [
        ('X-axis translation', 'x', 'metre', 1), ('Y-axis translation', 'y', 'metre', 1),
        ('Z-axis translation', 'z', 'metre', 1),
        ('X-axis rotation', 'rx', 'milliarc-second', .001),
        ('Y-axis rotation', 'ry', 'milliarc-second', .001),
        ('Z-axis rotation', 'rz', 'milliarc-second', .001),
        ('Scale difference', 's', 'parts per million', 1),
    ]:
        parameter = parameters[name]
        if parameter.unit_name != unit:
            raise ValueError(f'Unexpected unit in EPSG:{code}/{name}')
        parts.append(f'{key}={parameter.value * factor}')
    epoch = parameters['Transformation reference epoch'].value
    return ' '.join(parts), {'id': f'EPSG:{code}', 'name': op.name,
        'inverse': inverse, 'reference_epoch': epoch,
        'accuracy_metres': op.accuracy if op.accuracy >= 0 else None}


@lru_cache(maxsize=2)
def to_anchor(code):
    source = CRS.from_epsg(code)
    steps = ['proj=unitconvert xy_in=deg xy_out=rad', _cart(source)]
    operations = []
    for epsg, inverse in PZ_FRAMES[code]:
        step, description = _helmert(epsg, inverse)
        steps.append(step)
        operations.append(description)
    steps += ['inv ' + _cart(ANCHOR), 'proj=unitconvert xy_in=rad xy_out=deg']
    return Transformer.from_pipeline('proj=pipeline step ' + ' step '.join(steps)), operations
