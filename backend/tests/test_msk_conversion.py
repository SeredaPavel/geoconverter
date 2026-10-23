import importlib
import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from openpyxl import Workbook, load_workbook

from app.msk_registry import DEFINITIONS, MSK_ITEMS, READY_MSK_CRS
from app.schemas import ConvertRequest, Point


MSK47 = 'MSK:GEOPROJ:47:2'


class MskTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.uploads = tempfile.TemporaryDirectory()
        with patch.dict(os.environ, {'UPLOAD_DIR': cls.uploads.name}):
            cls.api = importlib.import_module('app.main')

    @classmethod
    def tearDownClass(cls):
        cls.uploads.cleanup()

    def setUp(self):
        upload_patch = patch.object(self.api, 'UPLOAD_DIR', Path(self.uploads.name))
        upload_patch.start()
        self.addCleanup(upload_patch.stop)

    def convert(self, source, target, points):
        return self.api.api_convert(ConvertRequest(crs_from=source, crs_to=target, points=points))

    async def test_registry_matches_executable_definitions(self):
        self.assertEqual(len(MSK_ITEMS), 259)
        self.assertEqual(len({item.code for item in MSK_ITEMS}), 259)
        self.assertEqual(set(READY_MSK_CRS), {MSK47})
        for item in MSK_ITEMS:
            self.assertEqual(item.status == 'ready', item.code in READY_MSK_CRS)
            self.assertTrue(item.region)
            self.assertTrue(item.description)

    async def test_geoproj_reference_points_and_axis_convention(self):
        for definition in DEFINITIONS:
            for point in definition['control_points']:
                with self.subTest(code=definition['code'], lat=point['lat']):
                    result = self.convert('EPSG:4326', definition['code'],
                                          [Point(lat=point['lat'], lon=point['lon'])])
                    actual = result.points[0]
                    tolerance = definition['verification_tolerance_metres']
                    self.assertAlmostEqual(actual.x, point['easting'], delta=tolerance)
                    self.assertAlmostEqual(actual.y, point['northing'], delta=tolerance)
                    self.assertFalse(result.meta['allow_ballpark'])
                    self.assertTrue(result.meta['operations'])
                    self.assertTrue(result.meta['regional_definitions'])
                    restored = self.convert(definition['code'], 'EPSG:4326', result.points).points[0]
                    self.assertAlmostEqual(restored.lat, point['lat'], places=6)
                    self.assertAlmostEqual(restored.lon, point['lon'], places=6)

    async def test_projection_origin_and_cross_systems(self):
        origin = self.convert('SK42_GEOG', MSK47, [Point(lat=.1, lon=30.95)]).points[0]
        self.assertAlmostEqual(origin.x, 2250000, places=6)
        self.assertAlmostEqual(origin.y, -6200000, places=6)
        original = self.convert('EPSG:4326', MSK47, [Point(lat=59.95, lon=30.3)])
        for target in ('SK63:EPSG:3351', 'GK_SK42', 'GK_SK95', 'GK_GSK2011', 'SK95_GEOG'):
            with self.subTest(target=target):
                converted = self.convert(MSK47, target, original.points)
                restored = self.convert(target, MSK47, converted.points).points[0]
                self.assertAlmostEqual(restored.x, original.points[0].x, delta=.02)
                self.assertAlmostEqual(restored.y, original.points[0].y, delta=.02)

    async def test_pending_unknown_and_invalid_points_are_rejected(self):
        for code in [item.code for item in MSK_ITEMS if item.status == 'dev'] + ['MSK:UNKNOWN', 'MSK-50']:
            for source, target in ((code, 'EPSG:4326'), ('EPSG:4326', code), (code, 'SK63:EPSG:3351')):
                with self.subTest(source=source, target=target), self.assertRaises(HTTPException) as error:
                    self.convert(source, target, [])
                self.assertEqual(error.exception.status_code, 400)
        for points in ([Point(lat=59.95, lon=30.3)], [Point(x=1e100, y=1e100)]):
            with self.assertRaises(HTTPException) as error:
                self.convert(MSK47, 'EPSG:4326', points)
            self.assertEqual(error.exception.status_code, 400)

    async def test_100_points_import_convert_and_export(self):
        original = [Point(lat=59.95 + i / 10000, lon=30.3 + i / 10000) for i in range(100)]
        projected = self.convert('EPSG:4326', MSK47, original).points
        workbook = Workbook()
        workbook.active.append(['X (м)', 'Y (м)'])
        for point in projected:
            workbook.active.append([point.x, point.y])
        content = io.BytesIO()
        workbook.save(content)
        content.seek(0)
        upload = UploadFile(filename='msk47.xlsx', file=content)
        try:
            imported = await self.api.api_import(upload)
        finally:
            await upload.close()
        points = [Point(x=row['X (м)'], y=row['Y (м)']) for row in imported['rows_preview']]
        result = self.convert(MSK47, 'EPSG:4326', points)
        self.assertEqual(len(result.points), 100)
        self.assertAlmostEqual(result.points[-1].lat, original[-1].lat, places=6)
        for kind in ('catalog', 'statement'):
            response = self.api.api_export(kind, self.api.ExportRequest(
                crs_from=MSK47, crs_to='EPSG:4326', rows_in=points, rows_out=result.points,
                format_out='deg_min_sec'))
            data = b''.join([chunk async for chunk in response.body_iterator])
            book = load_workbook(io.BytesIO(data), read_only=True)
            try:
                self.assertEqual(book.active.max_row, 102)
                self.assertEqual(book.active.cell(102, 1).value, 100)
                self.assertTrue(any('°' in str(c) for c in next(book.active.iter_rows(min_row=102, values_only=True))))
            finally:
                book.close()
