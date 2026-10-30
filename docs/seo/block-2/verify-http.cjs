// Verify the built site over HTTP, including metadata and actual asset responses.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const outputDirectory = path.resolve(process.argv[2] || __dirname);
fs.mkdirSync(outputDirectory, { recursive: true });
const base = 'http://127.0.0.1:3103';
const results = [];

async function read(route, status, contentType) {
  const response = await fetch(base + route);
  assert.equal(response.status, status, route);
  assert.match(response.headers.get('content-type'), contentType, route);
  const body = Buffer.from(await response.arrayBuffer());
  results.push({ route, status: response.status, contentType: response.headers.get('content-type'), bytes: body.length });
  return body;
}

(async () => {
  const html = (await read('/', 200, /text\/html/)).toString();
  assert.match(html, /<title>Конвертер координат онлайн — WGS84, МСК, СК-42 \| ГеоКонвертер<\/title>/);
  assert.equal((html.match(/<meta name="description"/g) || []).length, 1);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/geoconverter\.ru\/?"/);
  assert.match(html, /property="og:url" content="https:\/\/geoconverter\.ru\/?"/);
  assert.match(html, /property="og:image" content="https:\/\/geoconverter\.ru\/assets\/og-geoconverter\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /<html lang="ru"/);
  assert.match(html, /name="viewport"/);
  assert.doesNotMatch(html, /name="robots" content="[^"]*noindex/);
  assert.match(html, /href="\/favicon.ico/);
  assert.match(html, /href="\/icon.svg/);
  fs.writeFileSync(path.join(outputDirectory, 'home.after.html'), html);

  const robots = (await read('/robots.txt', 200, /text\/plain/)).toString();
  assert.match(robots, /User-Agent: \*/i);
  assert.match(robots, /Allow: \/\s/);
  assert.match(robots, /Disallow: \/api/);
  assert.match(robots, /Sitemap: https:\/\/geoconverter\.ru\/sitemap.xml/);
  assert.doesNotMatch(robots, /Disallow: \/_next/);
  const sitemap = (await read('/sitemap.xml', 200, /xml/)).toString();
  const routes = ['/converter', '/features', '/faq', '/support'];
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), ['https://geoconverter.ru/', ...routes.map(route => 'https://geoconverter.ru' + route)]);
  for (const route of routes) {
    const page = (await read(route, 200, /text\/html/)).toString();
    assert.equal((page.match(/<h1\b/g) || []).length, 1, route);
    assert.ok(page.includes(`rel="canonical" href="https://geoconverter.ru${route}"`), route);
    assert.doesNotMatch(page, /class="landing-(?:hero|content)/, route);
    assert.doesNotMatch(page, /role="dialog"/, route);
    assert.match(page, /aria-label="На главную"/, route);
  }
  assert.doesNotMatch(sitemap, /<lastmod>/);
  const missing = (await read('/seo-block-2-missing-page', 404, /text\/html/)).toString();
  assert.match(missing, /name="robots" content="noindex"/);
  assert.doesNotMatch(missing, /rel="canonical"/);

  const png = await read('/assets/og-geoconverter.png', 200, /image\/png/);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  const ico = await read('/favicon.ico', 200, /image\//);
  assert.equal(ico.readUInt16LE(2), 1);
  await read('/icon.svg', 200, /image\/svg\+xml/);
  const css = html.match(/href="([^\"]+\.css(?:\?[^\"]*)?)"/)[1];
  const js = html.match(/src="([^\"]+\.js(?:\?[^\"]*)?)"/)[1];
  await read(css, 200, /text\/css/);
  await read(js, 200, /javascript/);
  const crs = JSON.parse((await read('/api/crs', 200, /application\/json/)).toString());
  assert.equal(crs.length, 399);
  fs.writeFileSync(path.join(outputDirectory, 'http.after.json'), JSON.stringify({ checkedAt: new Date().toISOString(), results, robots, sitemap }, null, 2));
  console.log(`PASS: ${results.length} HTTP responses; metadata, canonical, 404, robots, sitemap, images, CSS, JS and API checked`);
})().catch(error => { console.error(error); process.exitCode = 1; });
