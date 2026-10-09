// Servidor estático mínimo para uso local: node tools/serve.js  →  http://localhost:5173
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.normalize(path.join(root, rel === '/' ? 'index.html' : rel));
  if (!file.startsWith(root) || /[\\/](\.git|tools|skill|docs)[\\/]/.test(file)) { res.writeHead(404); return res.end('No encontrado'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); res.end(buf);
  });
}).listen(5173, '127.0.0.1', () => console.log('Dashboard en http://localhost:5173'));
