import importlib
import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from openpyxl import Workbook, load_workbook

from app.schemas import ConvertRequest, Point
from app.sk63_registry import READY_CRS, SK63_ITEMS


class Sk63Tests(unittest.IsolatedAsyncioTestCase):
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

    async def test_registry_ready_and_dev_statuses(self):
        msk = [item for item in self.api.list_crs() if item.category == 'msk']
        self.assertEqual(len(msk), 259)
        self.assertEqual(sum(item.status == 'ready' for item in msk), 1)
        self.assertEqual(sum(item.status == 'dev' for item in msk), 258)
        choices = [item for item in self.api.list_crs() if item.category == 'sk63']
        self.assertEqual(len({item.code for item in choices}), len(choices))
        self.assertEqual(sum(item.status == 'ready' for item in choices), 17)
        self.assertEqual(sum(item.status == 'dev' for item in choices), 107)
        for item in choices:
            self.assertTrue(item.region)
            self.assertTrue(item.description)
            self.assertEqual(item.code in READY_CRS, item.status == 'ready')

    async def test_all_definitions_origin_coordinates_and_wgs_roundtrip(self):
        for code, crs in READY_CRS.items():
            with self.subTest(code=code):
                params = {p.code: p.value for p in crs.coordinate_operation.params}
                # Known projection invariant also catches an X/Y swap.
                projected = self.convert('SK42_GEOG', code,
                    [Point(lat=params['8801'], lon=params['8802'])]).points[0]
                self.assertAlmostEqual(projected.x, params['8806'], places=6)
                self.assertAlmostEqual(projected.y, params['8807'], places=6)
                area = crs.area_of_use
                original = Point(lat=(area.south + area.north) / 2, lon=(area.west + area.east) / 2)
                result = self.convert('EPSG:4326', code, [original])
                restored = self.convert(code, 'EPSG:4326', result.points).points[0]
                self.assertAlmostEqual(restored.lat, original.lat, places=5)
                self.assertAlmostEqual(restored.lon, original.lon, places=5)
                self.assertFalse(result.meta['allow_ballpark'])
                self.assertTrue(result.meta['operations'])

    async def test_dev_unknown_missing_fields_and_invalid_coordinates(self):
        for item in SK63_ITEMS:
            if item.status != 'dev':
                continue
            for source, target in ((item.code, 'EPSG:4326'), ('EPSG:4326', item.code)):
                with self.subTest(code=item.code), self.assertRaises(HTTPException) as error:
                    self.convert(source, target, [])
                self.assertEqual(error.exception.status_code, 400)
        for points in ([Point(lat=55, lon=30)], [Point(x=1e100, y=1e100)]):
            with self.assertRaises(HTTPException):
                self.convert('SK63:EPSG:3351', 'EPSG:4326', points)
        with self.assertRaises(HTTPException):
            self.convert('SK63:UNKNOWN', 'EPSG:4326', [])

    async def test_sk63_to_sk63_and_gk(self):
        start = self.convert('EPSG:4326', 'SK63:EPSG:7828', [Point(lat=48, lon=32)])
        for target in ('SK63:EPSG:7827', 'GK_SK42', 'GK_SK95', 'GK_GSK2011'):
            with self.subTest(target=target):
                result = self.convert('SK63:EPSG:7828', target, start.points)
                back = self.convert(target, 'SK63:EPSG:7828', result.points)
                self.assertAlmostEqual(back.points[0].x, start.points[0].x, places=2)
                self.assertAlmostEqual(back.points[0].y, start.points[0].y, places=2)

    async def test_100_sk63_points_import_convert_and_both_exports(self):
        original = [Point(lat=48 + i / 10000, lon=32 + i / 10000) for i in range(100)]
        projected = self.convert('EPSG:4326', 'SK63:EPSG:7828', original).points
        workbook = Workbook()
        workbook.active.append(['X (м)', 'Y (м)'])
        for point in projected:
            workbook.active.append([point.x, point.y])
        content = io.BytesIO()
        workbook.save(content)
        content.seek(0)
        upload = UploadFile(filename='sk63.xlsx', file=content)
        try:
            imported = await self.api.api_import(upload)
        finally:
            await upload.close()
        points = [Point(x=row['X (м)'], y=row['Y (м)']) for row in imported['rows_preview']]
        result = self.convert('SK63:EPSG:7828', 'EPSG:4326', points)
        self.assertEqual(len(result.points), 100)
        self.assertAlmostEqual(result.points[-1].lat, original[-1].lat, places=5)
        for kind in ('catalog', 'statement'):
            response = self.api.api_export(kind, self.api.ExportRequest(crs_from='SK63:EPSG:7828',
                crs_to='EPSG:4326', rows_in=points, rows_out=result.points, format_out='deg_min_sec'))
            data = b''.join([chunk async for chunk in response.body_iterator])
            book = load_workbook(io.BytesIO(data), read_only=True)
            try:
                self.assertEqual(book.active.max_row, 102)
                self.assertEqual(book.active.cell(102, 1).value, 100)
                self.assertTrue(any('°' in str(c) for c in next(book.active.iter_rows(min_row=102, values_only=True))))
            finally:
                book.close()
