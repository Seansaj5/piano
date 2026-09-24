#!/usr/bin/env node
// Local preview: `node bin/serve.js --open` starts the server and opens it in Chrome.
// Why Chrome: Safari with HTTPS-Only turned on refuses plain http, even for localhost
// ("Navigation failed because the request was for an HTTP URL with HTTPS-Only enabled").
// In Safari use the live site instead, or open index.html straight from Finder.
// (python's http.server takes ~35 s to accept connections on this Mac; this is instant.)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), PORT = +process.argv.slice(2).filter(a => /^\d+$/.test(a))[0] || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.otf': 'font/otf', '.m4a': 'audio/mp4', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  const url = 'http://localhost:' + PORT;
  console.log('Woodshed is at ' + url + '  (open it in Chrome; Safari with HTTPS-Only blocks plain http)');
  if (process.argv.includes('--open')) require('child_process').spawn('open', ['-a', 'Google Chrome', url], { stdio: 'ignore', detached: true }).unref();
});
