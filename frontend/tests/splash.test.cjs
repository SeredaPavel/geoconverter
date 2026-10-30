const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/Splash.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Exercise the component's real effects with tab-scoped storage and controlled timers.
function mount(storage = new Map(), initialPath = '/') {
  const hooks = [], timers = new Map();
  let cursor = 0, pathname = initialPath, timerId = 0, pending = [];
  const react = {
    useState(initial) {
      const slot = cursor++;
      hooks[slot] ??= { value: initial };
      return [hooks[slot].value, value => { hooks[slot].value = value; }];
    },
    useRef(initial) { const slot = cursor++; hooks[slot] ??= { current: initial }; return hooks[slot]; },
    useEffect(callback, deps) {
      const slot = cursor++;
      const previous = hooks[slot];
      const changed = !previous || deps.some((dep, index) => !Object.is(dep, previous.deps[index]));
      if (changed) pending.push(() => {
        previous?.cleanup?.();
        hooks[slot] = { deps, callback, cleanup: callback() };
      });
    },
  };
  const context = {
    exports: {},
    require: name => name === 'react' ? react : name === 'next/navigation' ? { usePathname: () => pathname } : require(name),
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(compiled, context);
  function render(nextPath = pathname) {
    pathname = nextPath; cursor = 0; pending = [];
    context.exports.default({});
    pending.forEach(effect => effect());
  }
  render();
  return {
    render, timers,
    visible: () => hooks[0].value,
    finish: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
    replayEffects: () => hooks.filter(hook => hook.callback).forEach(hook => { hook.cleanup?.(); hook.cleanup = hook.callback(); }),
  };
}

test('first visit animates once; Strict Mode replay retains a working dismissal timer', () => {
  const page = mount();
  assert.equal(page.visible(), true);
  page.replayEffects();
  assert.equal(page.timers.size, 1);
  page.finish();
  assert.equal(page.visible(), false);
  page.render('/converter'); page.render('/');
  assert.equal(page.visible(), false);
  assert.equal(page.timers.size, 0);
});

test('leaving during animation dismisses it and a quick return does not restart it', () => {
  const page = mount();
  page.render('/support');
  assert.equal(page.visible(), false);
  page.render('/');
  assert.equal(page.visible(), false);
  assert.equal(page.timers.size, 1);
});

test('reload in the same tab skips animation; a fresh tab session shows it again', () => {
  const session = new Map();
  mount(session).finish();
  assert.equal(mount(session).visible(), false);
  assert.equal(mount(new Map()).visible(), true);
});

test('entering through a section does not animate when later returning home', () => {
  const page = mount(new Map(), '/converter');
  assert.equal(page.visible(), false);
  page.render('/');
  assert.equal(page.visible(), false);
  assert.equal(page.timers.size, 0);
});
