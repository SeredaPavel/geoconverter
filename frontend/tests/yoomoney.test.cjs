const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/yoomoney.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context);
const { prepareYooMoneyTransfer, YOOMONEY_FORM_URL } = context.exports;

test("Quickpay uses the intended public wallet and official POST fields", () => {
  assert.equal(YOOMONEY_FORM_URL, "https://yoomoney.ru/quickpay/confirm");
  assert.deepEqual(JSON.parse(JSON.stringify(prepareYooMoneyTransfer("500"))), {
    receiver: "4100119668140952",
    "quickpay-form": "button",
    paymentType: "PC",
    label: "geoconverter-support",
    successURL: "https://geoconverter.ru/",
    sum: "500.00",
  });
});

test("roubles and kopecks are preserved, including a Russian decimal comma", () => {
  for (const [input, expected] of [["2", "2.00"], ["2,01", "2.01"], ["500.5", "500.50"],
    [" 001000,99 ", "1000.99"], ["14999.99", "14999.99"], ["15000", "15000.00"]]) {
    assert.equal(prepareYooMoneyTransfer(input).sum, expected);
  }
});

test("empty, malformed and out-of-range amounts cannot prepare a transfer", () => {
  for (const input of ["", " ", "0", "-1", "1.99", "15000.01", "20000", "1e3", "Infinity", "NaN",
    "2.001", "500 ₽", "1,234.56", "1 000", "abc", "9".repeat(100)]) {
    assert.throws(() => prepareYooMoneyTransfer(input), undefined, input);
  }
});

test("the rendered native form has one amount field and the correct recipient", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const panelSource = fs.readFileSync(path.join(__dirname, "../src/components/SupportPanel.tsx"), "utf8");
  const panelCode = ts.transpileModule(panelSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const panelContext = {
    exports: {},
    require: name => name === "@/lib/yoomoney" ? context.exports : require(name),
  };
  vm.runInNewContext(panelCode.outputText, panelContext);
  const html = renderToStaticMarkup(React.createElement(panelContext.exports.default));
  const form = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/)[0];
  assert.match(form, /method="POST"/);
  assert.match(form, /action="https:\/\/yoomoney.ru\/quickpay\/confirm"/);
  assert.match(form, /name="receiver" value="4100119668140952"/);
  assert.match(form, /name="quickpay-form" value="button"/);
  assert.match(form, /name="paymentType" value="PC"/);
  assert.equal((form.match(/name="sum"/g) || []).length, 1);
  assert.match(form, /type="submit"/);
  assert.doesNotMatch(form.match(/<button\b[^>]*>/)[0], /disabled/);
  assert.match(html, /id="support-methods" hidden=""/);
  assert.match(html, /inputMode="decimal"/);
});
