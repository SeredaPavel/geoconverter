"""Guard the reviewed batch: only verified variants may enter the runtime registry."""
import json
import unittest
from pathlib import Path

from app.msk_registry import DEFINITIONS_BY_CODE as MSK
from app.sk63_registry import VERIFIED_DEFINITIONS as SK63


class PublishedBatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(__file__).resolve().parents[1] / 'app/crs_registry'
        cls.review = json.loads((cls.root / 'published_batch_2026_10_29.json').read_text(encoding='utf-8'))
        cls.active = {**MSK, **SK63}

    def test_all_reviewed_records_have_provenance_and_independent_controls(self):
        codes = self.review['new_verified_codes']
        self.assertEqual(len(set(codes)), 324)
        self.assertEqual(sum(c.startswith('MSK:') for c in codes), 239)
        self.assertEqual(sum(c.startswith('SK63:') for c in codes), 85)
        for code in codes:
            with self.subTest(code=code):
                record = self.active[code]
                self.assertEqual(len(record['control_points']), 3)
                self.assertEqual(record['verification_source'], 'https://geoproj.ru/')
                self.assertEqual(record['verification_tolerance_metres'], .01)
                self.assertLess(record['observed_max_error_metres'], .01)
                self.assertLess(record['published_equivalence_error_metres'], .01)
                self.assertEqual(len(record['source_sha256']), 64)
                self.assertTrue(record['source_record_id'])
                self.assertTrue(record['published_proj4'].startswith('+proj=tmerc'))

    def test_rejected_variants_do_not_replace_verified_definitions(self):
        rejected = self.review['rejected_candidates']
        self.assertEqual(len(rejected), 11)
        for record in rejected:
            with self.subTest(code=record['code']):
                self.assertGreater(record['observed_max_error_metres'], .01)
                if record['code'] == 'MSK:GEOPROJ:30:2':
                    self.assertNotIn(record['code'], self.active)
                else:
                    active = self.active[record['code']]
                    self.assertEqual(active['definition_source'], 'https://geobridge.ru/proj/api')
                    self.assertNotEqual(active['published_proj4'], record['proj'])
        for region in ['09:2', '09:3']:
            self.assertNotIn(f'MSK:GEOPROJ:{region}', self.active)
        for district in 'BHUY':
            self.assertFalse(any(code.startswith(f'SK63:GEOPROJ:{district}:') for code in self.active))

    def test_source_revisions_and_license_are_preserved(self):
        urls = [source['url'] for source in self.review['sources']]
        self.assertTrue(any('/946049d80f0f4b4956a53383961c8c6f4431169f/' in url for url in urls))
        self.assertTrue(any('/ea767b0fe5afe96bfe6fc4c8c5aff85a54112dda/' in url for url in urls))
        self.assertIn('Apache License', (self.root / 'licenses/GEO_TS_APACHE_2_0.txt').read_text(encoding='utf-8'))
