const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the actual TypeScript helpers without adding a test dependency.
const source = fs.readFileSync(path.join(__dirname, "../src/lib/coordinates.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context);
const { parseAngle, formatAngle, numericPoints, excelPoints, reformatPoints } = context.exports;
const plain = value => JSON.parse(JSON.stringify(value));

test("decimal, minutes and seconds, including a negative angle below one degree", () => {
  for (const text of ["55.75833333333333", "55,75833333333333°", "55°45.5′", "55 45 30", "55°45′30″"]) {
    assert.ok(Math.abs(parseAngle(text) - (55 + 45 / 60 + 30 / 3600)) < 1e-10);
  }
  assert.equal(parseAngle("-0°30′00″"), -0.5);
  for (const value of ["", "NaN", "55°60′", "55°30′60″", "55.5°30′", "55°30.5′10″", "1 2 3 4"]) {
    assert.throws(() => parseAngle(value));
  }
  assert.throws(() => parseAngle(91, 90));
});

test("format changes and carry into the next degree", () => {
  assert.equal(formatAngle(55.75833333333333, "deg_min"), "55°45.5000′");
  assert.equal(formatAngle(55.75833333333333, "deg_min_sec"), "55°45′30.00″");
  assert.equal(formatAngle(12 + 59 / 60 + 59.99999 / 3600, "deg_min_sec"), "13°00′00.00″");
  assert.equal(formatAngle(-0.5, "deg_min_sec"), "-0°30′00.00″");
  const formatted = reformatPoints([{ lat: 55.5, lon: 37.5 }], "deg_min_sec");
  assert.deepEqual(plain(numericPoints(formatted)), [{ lat: 55.5, lon: 37.5 }]);
});

test("100 Excel points reach the request without changing X/Y", () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ "X (м)": 7500000 + i, "Y (м)": 6100000 + i }));
  const points = excelPoints(rows, ["X (м)", "Y (м)"], true, "deg_dec");
  const request = numericPoints(points);
  assert.equal(request.length, 100);
  assert.deepEqual(plain(request[99]), { x: 7500099, y: 6100099 });
  const geographic = excelPoints([{ lat: "55°45′30″", lon: "37°30′" }], ["lat", "lon"], false, "deg_min_sec");
  assert.deepEqual(plain(geographic), [{ lat: "55°45′30.00″", lon: "37°30′00.00″" }]);
  assert.throws(() => excelPoints([{ x: "bad", y: 1 }], ["x", "y"], true, "deg_dec"));
  assert.throws(() => numericPoints([{ x: Infinity, y: 1 }]));
});

test("nullable API fields support reverse and export", () => {
  const projected = [{ lat: null, lon: null, x: 8029743.225, y: 6207256.408, name: null }];
  assert.deepEqual(plain(reformatPoints(numericPoints(projected), "deg_min_sec")),
    [{ x: 8029743.225, y: 6207256.408 }]);
  const geographic = [{ lat: 55.5, lon: 37.5, x: null, y: null, name: null }];
  assert.deepEqual(plain(numericPoints(geographic)), [{ lat: 55.5, lon: 37.5 }]);
  assert.equal(formatAngle(null, "deg_min_sec"), "");
});
