const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function compile(file, imports = {}) {
  const result = ts.transpileModule(fs.readFileSync(path.join(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const context = { exports: {}, require: name => imports[name] || require(name) };
  vm.runInNewContext(result.outputText, context);
  return context.exports;
}
const helpers = compile("../src/lib/gk.ts");
const { defaultGkSettings, gkRequest } = helpers;
const plain = value => JSON.parse(JSON.stringify(value));
const zones = { 3: [7, 13, 64], 6: [4, 7, 32] };

test("independent sides serialize different widths and manual zones", () => {
  const source = { auto_zone: false, zone_mode: 6, zone: "7" };
  const target = { auto_zone: false, zone_mode: 3, zone: "13" };
  const options = { source_gk: gkRequest(source, zones), target_gk: gkRequest(target, zones) };
  assert.deepEqual(plain(options), {
    source_gk: { auto_zone: false, zone_mode: 6, zone: 7 },
    target_gk: { auto_zone: false, zone_mode: 3, zone: 13 },
  });
  assert.equal(gkRequest(defaultGkSettings(), zones).zone, null);
});

test("the API capability list controls validation, including gaps and unloaded data", () => {
  for (const zone of ["", "abc", "7.5", "33", "8"]) {
    assert.throws(() => gkRequest({ auto_zone: false, zone_mode: 6, zone }, zones));
  }
  assert.throws(() => gkRequest(defaultGkSettings()));
  assert.throws(() => gkRequest(defaultGkSettings(), {}));
  assert.equal(gkRequest({ auto_zone: false, zone_mode: 3, zone: "64" }, zones).zone, 64);
});

test("both zone forms render unique accessible controls and enable three degrees", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Panel = compile("../src/components/GkSettings.tsx", { "@/lib/gk": helpers }).default;
  const render = (side, value) => renderToStaticMarkup(React.createElement(Panel,
    { side, value, zones, onChange() {} }));
  const source = render("source", defaultGkSettings());
  const target = render("target", { auto_zone: false, zone_mode: 3, zone: "13" });
  assert.match(source, /id="gk-source-width"/);
  assert.match(target, /id="gk-target-width"/);
  assert.match(source, /<option value="3">3°<\/option>/);
  assert.match(source, /<select[^>]+id="gk-source-zone"[^>]+disabled=""/);
  assert.doesNotMatch(target.match(/<select[^>]+id="gk-target-zone"[^>]*>/)[0], /disabled/);
  assert.match(target, /<option value="13" selected="">13<\/option>/);
  assert.match(source, /миллионного префикса/);
});
