const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Published PROJ UTM examples, also covered by backend/tests/test_utm_conversion.py.
const examples = [
  { lat: 56, lon: 12, zone: 32, hemisphere: 'N', expected: { x: 687071.44, y: 6210141.33 } },
  { lat: -44, lon: 174, zone: 59, hemisphere: 'S', expected: { x: 740526.32, y: 5123750.87 } },
];

(async () => {
  const results = [];
  for (const example of examples) {
    const response = await fetch('http://127.0.0.1:3103/api/convert', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ crs_from: 'EPSG:4326', crs_to: 'UTM_WGS84',
        points: [{ lat: example.lat, lon: example.lon }],
        options: { target_utm: { zone: example.zone, hemisphere: example.hemisphere } } }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    const actual = result.points[0];
    assert.ok(Math.abs(actual.x - example.expected.x) <= .01);
    assert.ok(Math.abs(actual.y - example.expected.y) <= .01);
    results.push({ ...example, actual: { x: actual.x, y: actual.y } });
  }
  fs.writeFileSync(path.join(__dirname, 'examples.json'), JSON.stringify({
    source: 'https://proj.org/en/stable/operations/projections/utm.html',
    checked_at: new Date().toISOString(), results,
  }, null, 2));
  console.log('PASS: both published UTM examples match the API within 0.01 m');
})().catch(error => { console.error(error); process.exitCode = 1; });
