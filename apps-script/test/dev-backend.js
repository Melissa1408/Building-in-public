// Backend LOCAL de desarrollo: ejecuta el mismo Code.gs con Google simulado, en memoria. Uso: node apps-script/test/dev-backend.js
// Crea el usuario demo@example.com (límite 2/día). La IA devuelve un post de ejemplo (no llama a Anthropic).
const http = require('http');
const { createRuntime } = require('./mock');
const rt = createRuntime({ props: { DAILY_AI_LIMIT: '2' } });
rt.setup();
(process.env.DEV_USERS || 'demo@example.com').split(',').forEach((e) => rt.addUser(e.trim(), 'Demo'));
rt.setAi(() => ({ code: 200, body: { content: [{ type: 'text', text: JSON.stringify({
  formato: 'Honest Tradeoff', porque: 'Eligió entre dos opciones con costos claros.', problema: 'Elegir una herramienta', publico: 'Desarrolladores senior / Tech Leads',
  tipo: 'Decisión', patron_hook: 'Contraste antes/después', hook: 'Elegí rápido y me costó una tarde.', cuerpo: 'Cuerpo de ejemplo del post.',
  completo: false, pendientes: [{ dato: 'Qué perdió', pregunta: '¿Qué perdiste al elegir esa herramienta?' }], memoria: ['Dato de ejemplo aprendido'] }) }] } }));
http.createServer((req, res) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'content-type': 'application/json' };
  if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    res.writeHead(200, h);
    res.end(req.method === 'POST' ? rt.g.doPost({ postData: { contents: b } }).getContent() : rt.g.doGet().getContent());
  });
}).listen(8787, '127.0.0.1', () => console.log('Backend de desarrollo en http://localhost:8787 (usuarios: ' + (process.env.DEV_USERS || 'demo@example.com') + ')'));
