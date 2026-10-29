import math
import unittest

from fastapi import HTTPException
from pyproj import CRS, Transformer

from app.conversion_engine import convert_numeric, GEODETIC_EPSG, REGIONAL_CRS
from app.gk_registry import get_crs, supported_zones, longitude_zone, FAMILIES
from app.reference_frames import to_anchor
from app.schemas import ConvertRequest, Point


def convert(source, target, points, **options):
    return convert_numeric(ConvertRequest(crs_from=source, crs_to=target, points=points, options=options))


def manual(width, zone):
    return {'auto_zone': False, 'zone_mode': width, 'zone': zone}


class UnifiedConversionTests(unittest.TestCase):
    def test_all_261_projection_origins_and_inverse_in_own_datum(self):
        count = 0
        for family, definition in FAMILIES.items():
            base = f"EPSG:{definition['base_epsg']}"
            for width, zones in supported_zones(family).items():
                for zone in zones:
                    with self.subTest(family=family, width=width, zone=zone):
                        longitude = (width * zone - (3 if width == 6 else 0) + 180) % 360 - 180
                        # Central meridian on the equator is the exact false origin.
                        result = convert(base, family, [Point(lat=0, lon=longitude)],
                                         target_gk=manual(width, zone))
                        self.assertAlmostEqual(result.points[0].x, zone * 1_000_000 + (250_000 if family == "GK_GSK2011" and width == 3 else 500_000), delta=1e-6)
                        self.assertAlmostEqual(result.points[0].y, 0, delta=1e-6)
                        original = [Point(lat=55, lon=longitude + .1)]
                        result = convert(base, family, original, target_gk=manual(width, zone))
                        restored = convert(family, base, result.points, source_gk=manual(width, zone))
                        self.assertAlmostEqual(restored.points[0].lat, 55, places=8)
                        self.assertAlmostEqual(restored.points[0].lon, longitude + .1, places=8)
                        count += 1
        self.assertEqual(count, 261)

    def test_epsg_gaps_and_new_gsk_definitions_are_preserved(self):
        for family, zone, code in [('GK_SK42', 33, 2549), ('GK_SK42', 34, 2551),
                                   ('GK_SK42', 60, 3389), ('GK_SK95', 60, 3390)]:
            self.assertEqual(get_crs(family, 3, zone).to_epsg(), code)
        gsk = get_crs('GK_GSK2011', 3, 13)
        self.assertEqual(gsk.to_epsg(), 21213)
        self.assertEqual(gsk.axis_info[0].direction, "north")
        origin = convert("GSK2011_GEOG", "EPSG:21213", [Point(lat=0, lon=39)]).points[0]
        self.assertAlmostEqual(origin.x, 13250000, delta=1e-6)
        self.assertEqual(gsk.geodetic_crs.to_epsg(), 7683)
        self.assertAlmostEqual(gsk.ellipsoid.semi_major_metre, 6378136.5)
        self.assertEqual(get_crs('GK_SK42', 6, 4).to_epsg(), 28404)
        self.assertEqual(get_crs('GK_SK95', 6, 32).to_epsg(), 20032)
        self.assertEqual(get_crs('GK_GSK2011', 6, 32).to_epsg(), 20932)

    def test_independent_widths_and_zones_for_all_gk_family_pairs(self):
        for source in FAMILIES:
            original = convert('EPSG:4326', source, [Point(lat=55.75, lon=37.6)], target_gk=manual(6, 7))
            for target in FAMILIES:
                with self.subTest(source=source, target=target):
                    expected = convert('EPSG:4326', target, [Point(lat=55.75, lon=37.6)], target_gk=manual(3, 13))
                    result = convert(source, target, original.points,
                                     source_gk=manual(6, 7), target_gk=manual(3, 13))
                    self.assertAlmostEqual(result.points[0].x, expected.points[0].x, delta=.02)
                    self.assertAlmostEqual(result.points[0].y, expected.points[0].y, delta=.02)
                    self.assertEqual(result.meta['source_used_zones'], [7])
                    self.assertEqual(result.meta['target_used_zones'], [13])
                    restored = convert(target, source, result.points,
                                       source_gk=manual(3, 13), target_gk=manual(6, 7))
                    self.assertAlmostEqual(restored.points[0].x, original.points[0].x, delta=.02)
                    self.assertAlmostEqual(restored.points[0].y, original.points[0].y, delta=.02)

    def test_automatic_source_prefix_target_datum_and_multiple_zones(self):
        points = [Point(lat=55, lon=37), Point(lat=55, lon=45)]
        for source in FAMILIES:
            original = convert('EPSG:4326', source, points, target_gk={'zone_mode': 3})
            for target in FAMILIES:
                result = convert(source, target, original.points,
                                 source_gk={'zone_mode': 3}, target_gk={'zone_mode': 6})
                self.assertEqual(result.meta['source_used_zones'], [12, 15])
                self.assertEqual(result.meta['target_used_zones'], [7, 8])
        # WGS longitude immediately west of 36 crosses the target-datum boundary.
        source = Point(lat=55, lon=35.999)
        target_lon, _ = Transformer.from_crs(4326, 4284, always_xy=True, allow_ballpark=False).transform(source.lon, source.lat)
        self.assertGreater(target_lon, 36)
        self.assertEqual(convert('EPSG:4326', 'GK_SK42', [source]).meta['target_used_zones'], [7])

    def test_eastern_russia_antimeridian_and_three_degree_boundaries(self):
        for family in FAMILIES:
            self.assertEqual(longitude_zone(family, 6, -177), 31)
            self.assertEqual(longitude_zone(family, 3, -177), 61)
            self.assertEqual(longitude_zone(family, 3, 180), 60)
            self.assertEqual(longitude_zone(family, 3, -180), 60)
            self.assertEqual(longitude_zone(family, 3, 37.499999), 12)
            self.assertEqual(longitude_zone(family, 3, 37.5), 13)
            base = f"EPSG:{FAMILIES[family]['base_epsg']}"
            for width in (3, 6):
                result = convert(base, family, [Point(lat=66, lon=-177)], target_gk={'zone_mode': width})
                restored = convert(family, base, result.points, source_gk={'zone_mode': width})
                self.assertAlmostEqual(restored.points[0].lon, -177, places=8)

    def test_invalid_ranges_unknown_and_development_codes_even_for_empty_batch(self):
        for family in FAMILIES:
            for width, bad_zones in [(6, [2, 3, 33]), (3, [6, 65])]:
                for zone in bad_zones:
                    for source, target, options in [(family, 'EPSG:4326', {'source_gk': manual(width, zone)}),
                                                    ('EPSG:4326', family, {'target_gk': manual(width, zone)})]:
                        with self.subTest(source=source, target=target, zone=zone), self.assertRaises(HTTPException) as error:
                            convert(source, target, [], **options)
                        self.assertEqual(error.exception.status_code, 400)
            with self.assertRaises(HTTPException):
                convert(family, 'EPSG:4326', [], source_gk={'auto_zone': False})
        for source in ('EPSG:999999', 'MSK:GEOBRIDGE:78:1', 'MSK:unknown', 'SK63:unknown'):
            with self.subTest(source=source), self.assertRaises(HTTPException) as error:
                convert(source, 'EPSG:4326', [])
            self.assertEqual(error.exception.status_code, 400)
        with self.assertRaises(HTTPException):
            convert('GK_SK42', 'EPSG:4326', [Point(x=500000, y=6100000)])

    def test_legacy_options_and_explicit_side_precedence(self):
        original = convert('EPSG:4326', 'GK_SK42', [Point(lat=55, lon=37)], auto_zone=False, zone=7)
        expected = convert('EPSG:4326', 'GK_SK95', [Point(lat=55, lon=37)], target_gk=manual(3, 13))
        result = convert('GK_SK42', 'GK_SK95', original.points, auto_zone=False, zone=7,
                         target_gk=manual(3, 13))
        self.assertEqual(result.meta['source_used_zones'], [7])
        self.assertEqual(result.meta['target_used_zones'], [13])
        self.assertAlmostEqual(result.points[0].x, expected.points[0].x, delta=.02)

    def test_all_geographic_pairs_are_finite_and_expose_pz_assumptions(self):
        for source in GEODETIC_EPSG:
            for target in GEODETIC_EPSG:
                with self.subTest(source=source, target=target):
                    result = convert(source, target, [Point(lat=55, lon=37)])
                    self.assertTrue(math.isfinite(result.points[0].lat))
                    self.assertTrue(math.isfinite(result.points[0].lon))
                    self.assertFalse(result.meta['allow_ballpark'])
                    special = source != target and any(c in (source, target) for c in ('PZ90_02_GEOG', 'PZ90_11_GEOG'))
                    self.assertEqual(bool(result.meta['assumptions']), special)
                    if special:
                        operation = result.meta['operations'][0]
                        self.assertFalse(operation['coordinate_epoch_modelled'])
                        self.assertEqual(operation['assumed_input_height_metres'], 0)
                        self.assertIsNone(operation['accuracy_metres'])

    def test_regional_and_gk_pairs_share_one_path(self):
        # Every connected regional definition can enter and leave each GK family.
        # These are route checks, not accuracy controls outside a zone's area.
        for regional in REGIONAL_CRS:
            point = convert('EPSG:4326', regional, [Point(lat=55.75, lon=37.6)])
            for family in FAMILIES:
                with self.subTest(regional=regional, family=family):
                    result = convert(regional, family, point.points, target_gk=manual(3, 13))
                    restored = convert(family, regional, result.points, source_gk=manual(3, 13))
                    self.assertAlmostEqual(restored.points[0].x, point.points[0].x, delta=.05)
                    self.assertAlmostEqual(restored.points[0].y, point.points[0].y, delta=.05)

    def test_pz_helmert_parameters_against_independent_cartesian_formula(self):
        # EPSG:7703 (2010) and inverse EPSG:7705 (2011), units from the
        # upstream PROJ/EPSG registry: translation m, rotation mas, scale ppm.
        # Independent geocentric calculation catches sign/unit/order mistakes.
        cart = Transformer.from_crs(9474, 7677, always_xy=True)  # PZ-90.02 geocentric
        x, y, z = cart.transform(37, 55, 0)
        self.assertGreater(abs(z), 1_000_000)
        def matrix(params):
            tx, ty, tz, rx, ry, rz, scale = params
            rx, ry, rz = [v * math.pi / (180 * 3600 * 1000) for v in (rx, ry, rz)]
            m = 1 + scale * 1e-6
            return (tx, ty, tz), [[m, m * rz, -m * ry], [-m * rz, m, m * rx], [m * ry, -m * rx, m]]
        def forward(point, params):
            t, a = matrix(params)
            return [t[i] + sum(a[i][j] * point[j] for j in range(3)) for i in range(3)]
        def inverse(point, params):
            t, a = matrix(params)
            b = [point[i] - t[i] for i in range(3)]
            # Solve the full matrix instead of approximating inverse signs.
            for i in range(3):
                pivot = a[i][i]
                a[i] = [v / pivot for v in a[i]]
                b[i] /= pivot
                for k in range(3):
                    if k != i:
                        factor = a[k][i]
                        a[k] = [a[k][j] - factor * a[i][j] for j in range(3)]
                        b[k] -= factor * b[i]
            return b
        p = forward((x, y, z), (-.373, .186, .202, -2.3, 3.54, -4.21, -.008))
        p = inverse(p, (0, .014, -.008, -.562, -.019, .053, -.0006))
        # Inverse cartographic conversion in GSK-2011 uses its own ellipsoid.
        geographic = Transformer.from_pipeline('+proj=pipeline +step +inv +proj=cart +a=6378136.5 +rf=298.2564151 +step +proj=unitconvert +xy_in=rad +xy_out=deg')
        lon, lat, height = geographic.transform(*p)
        actual = to_anchor(9474)[0].transform(37, 55, 0)
        self.assertAlmostEqual(actual[0], lon, places=11)
        self.assertAlmostEqual(actual[1], lat, places=11)
        self.assertAlmostEqual(actual[2], height, delta=1e-6)
