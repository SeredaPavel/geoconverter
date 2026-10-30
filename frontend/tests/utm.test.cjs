const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function compile(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const context = { exports: {}, require: name => imports[name] || require(name) };
  vm.runInNewContext(code.outputText, context);
  return context.exports;
}
const helpers = compile("../src/lib/utm.ts");
const zones = Array.from({ length: 60 }, (_, i) => i + 1);

test("UTM requests preserve explicit zone and hemisphere independently on both sides", () => {
  assert.equal(helpers.utmRequest({ zone: "37", hemisphere: "N" }, zones).zone, 37);
  assert.equal(helpers.utmRequest({ zone: "59", hemisphere: "S" }, zones).hemisphere, "S");
  for (const zone of ["1", "60"]) assert.equal(helpers.utmRequest({ zone, hemisphere: "N" }, zones).zone, Number(zone));
  for (const zone of ["", "0", "61", "abc", "1.5"]) {
    assert.throws(() => helpers.utmRequest({ zone, hemisphere: "N" }, zones));
  }
  assert.throws(() => helpers.utmRequest({ zone: "37", hemisphere: "X" }, zones));
  assert.throws(() => helpers.utmRequest({ zone: "37", hemisphere: "N" }));
});

test("UTM forms expose separate accessible zone and hemisphere controls", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const Panel = compile("../src/components/UtmSettings.tsx", { "@/lib/utm": helpers }).default;
  for (const side of ["source", "target"]) {
    const html = renderToStaticMarkup(React.createElement(Panel, {
      side, zones, value: { zone: "59", hemisphere: "S" }, onChange() {},
    }));
    assert.match(html, new RegExp(`id="utm-${side}-zone"`));
    assert.match(html, new RegExp(`id="utm-${side}-hemisphere"`));
    assert.match(html, /<option value="59" selected="">59<\/option>/);
    assert.match(html, /<option value="S" selected="">Южное<\/option>/);
    assert.match(html, /<option value="60">60<\/option>/);
  }
});
