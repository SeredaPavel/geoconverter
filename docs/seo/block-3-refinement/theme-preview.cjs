// Diagnostic-only proxy: select production CSS media rules without changing OS preferences.
// Open http://127.0.0.1:3104/?previewTheme=light (or dark).
const http = require('node:http');
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:3104');
  const selected = url.searchParams.get('previewTheme');
  const theme = selected || /previewTheme=(light|dark)/.exec(request.headers.cookie || '')?.[1] || 'light';
  url.searchParams.delete('previewTheme');
  const upstream = http.request({
    hostname: '127.0.0.1', port: 3103, path: url.pathname + url.search,
    method: request.method,
    headers: { ...request.headers, host: '127.0.0.1:3103', 'accept-encoding': 'identity' },
  }, result => {
    const chunks = [];
    result.on('data', chunk => chunks.push(chunk));
    result.on('end', () => {
      let body = Buffer.concat(chunks);
      const headers = { ...result.headers, 'cache-control': 'no-store' };
      delete headers['content-length'];
      delete headers.etag;
      if (selected) headers['set-cookie'] = `previewTheme=${theme}; Path=/; SameSite=Lax`;
      if ((headers['content-type'] || '').includes('text/css')) {
        body = Buffer.from(body.toString()
          .replace(/\(prefers-color-scheme:\s*(dark|light)\)/g,
            (_, scheme) => scheme === theme ? '(min-width:0px)' : '(max-width:0px)')
          + `\n:root{color-scheme:${theme}}`);
      }
      response.writeHead(result.statusCode, headers);
      response.end(body);
    });
  });
  upstream.on('error', error => { response.writeHead(502); response.end(error.message); });
  request.pipe(upstream);
}).listen(3104, '127.0.0.1', () => console.log('Theme diagnostics: http://127.0.0.1:3104/?previewTheme=light'));
