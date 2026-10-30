const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = 'http://127.0.0.1:3103';

(async () => {
  const pages = new Map();
  for (const route of ['/', '/features', '/faq', '/converter']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    const body = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    assert.equal((body.match(/<h1\b/g) || []).length, 1, route);
    pages.set(route, body);
  }
  const features = pages.get('/features');
  for (const id of ['operations', 'systems', 'excel', 'sources', 'accuracy', 'examples']) {
    assert.equal((features.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, id);
  }
  assert.doesNotMatch(features, /высокая точность расчетов|мгновенная конвертация/);
  assert.ok(features.includes('pyproj'));
  assert.ok(features.includes('687071,44'));
  assert.ok(features.includes('5123750,87'));
  assert.ok(pages.get('/converter').includes('id="converter-guide-title"'));
  assert.ok(pages.get('/faq').includes('/features#accuracy'));
  const checked = new Set();
  for (const [route, body] of pages) {
    for (const match of body.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      const target = new URL(match[1].replaceAll('&amp;', '&'), origin + route);
      if (target.origin !== origin || checked.has(target.href)) continue;
      checked.add(target.href);
      const response = await fetch(target);
      assert.equal(response.status, 200, target.href);
      if (target.hash) {
        const targetBody = pages.get(target.pathname) || await response.text();
        assert.ok(targetBody.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), target.href);
      }
    }
  }
  fs.writeFileSync(path.join(__dirname, 'content-checks.json'), JSON.stringify({
    checked_at: new Date().toISOString(), pages: [...pages.keys()], checkedLinks: [...checked],
    singleH1: true, contentInInitialHtml: true, uniqueAnchors: true,
  }, null, 2));
  console.log(`PASS: 4 pages, unique anchors and ${checked.size} internal links including templates`);
})().catch(error => { console.error(error); process.exitCode = 1; });
