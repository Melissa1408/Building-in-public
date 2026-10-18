// Backend LOCAL de desarrollo: ejecuta el mismo Code.gs con Google simulado, en memoria. Uso: node apps-script/test/dev-backend.js
// Crea el usuario demo@example.com (límite 2/día). La IA devuelve un post de ejemplo (no llama a Anthropic).
const http = require('http');
const { createRuntime } = require('./mock');
const fs = require('fs'), os = require('os'), path = require('path');
const rt = createRuntime({ props: { DAILY_AI_LIMIT: '2', EMAIL_FROM_NAME: 'Nombre Ejemplo', EMAIL_LINKEDIN_URL: 'https://www.linkedin.com/in/tu-perfil', EMAIL_FOOTER_TEXT: 'Si te sirvió, conversemos.', SITE_URL: 'https://tu-usuario.github.io/Building-in-public/' } });
const MAIL_FILE = path.join(os.tmpdir(), 'bip-ultimo-correo.html');
let mailsSeen = 0;
rt.setup();
// Usuarios manuales opcionales (DEV_USERS). Cualquier otro correo se auto-registra como prueba (2 usos).
(process.env.DEV_USERS || '').split(',').filter(Boolean).forEach((e) => rt.addUser(e.trim(), 'Manual'));
rt.setAi(() => ({ code: 200, body: { content: [{ type: 'text', text: JSON.stringify({
  formato: 'Honest Tradeoff', porque: 'Eligió entre dos opciones con costos claros.', problema: 'Elegir una herramienta', publico: 'Desarrolladores senior / Tech Leads',
  tipo: 'Decisión', patron_hook: 'Contraste antes/después', hook: 'Elegí rápido y me costó una tarde.', cuerpo: 'Cuerpo de ejemplo del post.',
  completo: false, pendientes: [{ dato: 'Qué perdió', pregunta: '¿Qué perdiste al elegir esa herramienta?' }, { dato: 'Resultado', pregunta: '¿Qué resultado tuviste?' }], memoria: ['Dato de ejemplo aprendido'] }) }] } }));
http.createServer((req, res) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'content-type': 'application/json' };
  if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    res.writeHead(200, h);
    const out = req.method === 'POST' ? rt.g.doPost({ postData: { contents: b } }).getContent() : rt.g.doGet().getContent();
    if (rt.calls.mail.length > mailsSeen) { mailsSeen = rt.calls.mail.length; fs.writeFileSync(MAIL_FILE, rt.calls.mail[mailsSeen - 1].htmlBody); console.log('Correo simulado guardado en ' + MAIL_FILE); }
    res.end(out);
  });
}).listen(8787, '127.0.0.1', () => console.log('Backend de desarrollo en http://localhost:8787 (auto-registro activo)'));
