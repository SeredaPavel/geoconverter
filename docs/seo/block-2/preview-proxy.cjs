// Local verification only. No changes to Next.js or production routing.
const http = require('node:http');

http.createServer((request, response) => {
  const port = request.url === '/api' || request.url.startsWith('/api/') ? 18002 : 3102;
  const upstream = http.request({
    hostname: '127.0.0.1', port,
    method: request.method, path: request.url,
    headers: { ...request.headers, host: `127.0.0.1:${port}` },
  }, result => {
    response.writeHead(result.statusCode, result.headers);
    result.pipe(response);
  });
  upstream.on('error', error => {
    response.writeHead(502, { 'content-type': 'text/plain' });
    response.end(error.message);
  });
  request.pipe(upstream);
}).listen(3103, '127.0.0.1', () => console.log('Local preview: http://127.0.0.1:3103'));
