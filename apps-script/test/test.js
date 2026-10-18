// Pruebas de Code.gs con Google simulado. Uso: node apps-script/test/test.js
const assert = require('assert');
const { createRuntime } = require('./mock');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('✔', name); };

function fresh(props) {
  const rt = createRuntime({ props: Object.assign({ AUTO_REGISTER: 'NO' }, props) });
  rt.setup();
  rt.addUser('Ana@Example.com', 'Ana');
  rt.addUser('inactivo@example.com', 'X', 'NO');
  rt.addUser('vip@example.com', 'Vip', 'SI', 5);
  rt.addUser('secreto@example.com', 'S', 'SI', '', '1234');
  return rt;
}
const login = (rt, email, codigo) => rt.post({ action: 'login', email, codigo });

t('login: correo existente (sin importar mayúsculas) entra y devuelve token', () => {
  const rt = fresh(); const r = login(rt, ' ana@example.COM ');
  assert.ok(r.ok && r.token && r.user.nombre === 'Ana'); assert.strictEqual(r.usage.ai.limit, 2);
});
t('login: correo que no está en el Sheet es rechazado', () => { assert.strictEqual(login(fresh(), 'nadie@example.com').code, 'denied'); });
t('login: usuario con activo=NO es rechazado (mismo mensaje que inexistente)', () => {
  const rt = fresh(); assert.strictEqual(login(rt, 'inactivo@example.com').error, login(rt, 'nadie@example.com').error);
});
t('login: correo con formato inválido es rechazado (también con auto-registro)', () => {
  assert.strictEqual(login(fresh(), 'no-es-correo').code, 'invalid');
  assert.strictEqual(login(fresh({ AUTO_REGISTER: 'SI' }), '=cmd@x.com').code, 'invalid');
});
t('login: código de acceso se exige solo si el usuario lo tiene', () => {
  const rt = fresh();
  assert.strictEqual(login(rt, 'secreto@example.com', 'mal').code, 'code');
  assert.ok(login(rt, 'secreto@example.com', '1234').ok);
});
t('token manipulado o ajeno es rechazado', () => {
  const rt = fresh(); const tk = login(rt, 'ana@example.com').token;
  assert.strictEqual(rt.post({ action: 'load', token: tk + 'x' }).code, 'auth');
  assert.strictEqual(rt.post({ action: 'load', token: 'a.b' }).code, 'auth');
  assert.strictEqual(rt.post({ action: 'load' }).code, 'auth');
});
t('token deja de valer si el usuario se desactiva', () => {
  const rt = fresh(); const tk = login(rt, 'ana@example.com').token;
  rt.tabs.Usuarios.cells.find((r) => r[0] === 'Ana@Example.com')[2] = 'NO';
  assert.strictEqual(rt.post({ action: 'load', token: tk }).code, 'auth');
});
t('save/load: guarda por colección, reemplaza y no mezcla usuarios', () => {
  const rt = fresh(); rt.addUser('b@example.com', 'B');
  const a = login(rt, 'ana@example.com').token, b = login(rt, 'b@example.com').token;
  assert.ok(rt.post({ action: 'load', token: a }).empty);
  rt.post({ action: 'save', token: a, changes: { memory: [{ id: '1', json: '{"texto":"uno"}' }, { id: '2', json: '{"texto":"dos"}' }], doc: [{ id: 'profile', json: '{"nombre":"Ana"}' }] } });
  rt.post({ action: 'save', token: b, changes: { memory: [{ id: 'x', json: '{"texto":"de B"}' }] } });
  rt.post({ action: 'save', token: a, changes: { memory: [{ id: '2', json: '{"texto":"dos"}' }] } }); // reemplaza solo memory de A
  const la = rt.post({ action: 'load', token: a }), lb = rt.post({ action: 'load', token: b });
  assert.deepStrictEqual(la.collections.memory.map((x) => x.id), ['2']);
  assert.strictEqual(la.collections.doc.length, 1);
  assert.deepStrictEqual(lb.collections.memory.map((x) => x.id), ['x']);
  rt.post({ action: 'save', token: a, changes: { memory: [] } });
  assert.strictEqual(rt.post({ action: 'load', token: a }).collections.memory.length, 0);
});
t('save: rechaza colecciones inválidas y celdas demasiado grandes', () => {
  const rt = fresh(); const a = login(rt, 'ana@example.com').token;
  assert.strictEqual(rt.post({ action: 'save', token: a, changes: { hack: [] } }).code, 'bad');
  assert.strictEqual(rt.post({ action: 'save', token: a, changes: { posts: [{ id: '1', json: 'x'.repeat(50000) }] } }).code, 'big');
});
t('save: texto que empieza con "=" no se interpreta como fórmula en el resumen', () => {
  const rt = fresh(); const a = login(rt, 'ana@example.com').token;
  rt.post({ action: 'save', token: a, changes: { feedback: [{ id: '1', json: '=HYPERLINK("x")' }] } });
  assert.ok(rt.tabs.Datos.cells.find((r) => r[1] === 'feedback')[3].startsWith("'"));
});
t('IA: 2 llamadas por día y la tercera se bloquea', () => {
  const rt = fresh(); const a = login(rt, 'ana@example.com').token; const ask = () => rt.post({ action: 'ai', token: a, system: 's', user: 'u' });
  const r1 = ask(), r2 = ask(), r3 = ask();
  assert.ok(r1.ok && r2.ok); assert.strictEqual(r2.usage.ai.used, 2);
  assert.strictEqual(r3.code, 'limit'); assert.strictEqual(rt.calls.fetch.length, 2, 'la 3.ª no debe llamar a la IA');
});
t('IA: el límite es por usuario, no global', () => {
  const rt = fresh(); const a = login(rt, 'ana@example.com').token, v = login(rt, 'vip@example.com').token;
  for (let i = 0; i < 2; i++) rt.post({ action: 'ai', token: a, system: 's', user: 'u' });
  assert.strictEqual(rt.post({ action: 'ai', token: a, system: 's', user: 'u' }).code, 'limit');
  assert.ok(rt.post({ action: 'ai', token: v, system: 's', user: 'u' }).ok);
  assert.strictEqual(rt.post({ action: 'load', token: v }).usage.ai.limit, 5);
});
t('IA: si la API falla no consume el cupo', () => {
  const rt = fresh(); const a = login(rt, 'ana@example.com').token;
  rt.setAi(() => ({ code: 500, body: { error: { message: 'caída' } } }));
  assert.strictEqual(rt.post({ action: 'ai', token: a, system: 's', user: 'u' }).code, 'ai');
  assert.strictEqual(rt.post({ action: 'load', token: a }).usage.ai.used, 0);
});
t('IA: tope global diario protege la clave', () => {
  const rt = fresh({ GLOBAL_DAILY_AI_LIMIT: '1' }); rt.addUser('b@example.com', 'B');
  const a = login(rt, 'ana@example.com').token, b = login(rt, 'b@example.com').token;
  assert.ok(rt.post({ action: 'ai', token: a, system: 's', user: 'u' }).ok);
  assert.strictEqual(rt.post({ action: 'ai', token: b, system: 's', user: 'u' }).code, 'limit');
});
t('IA: límite configurable por variable DAILY_AI_LIMIT', () => {
  const rt = fresh({ DAILY_AI_LIMIT: '1' }); const a = login(rt, 'ana@example.com').token;
  assert.ok(rt.post({ action: 'ai', token: a, system: 's', user: 'u' }).ok);
  assert.strictEqual(rt.post({ action: 'ai', token: a, system: 's', user: 'u' }).code, 'limit');
});
t('IA: limita tamaño de prompt y max_tokens, y la clave nunca viaja al cliente', () => {
  const rt = fresh(); const a = login(rt, 'ana@example.com').token;
  assert.strictEqual(rt.post({ action: 'ai', token: a, system: 'x'.repeat(70000), user: 'u' }).code, 'bad');
  const r = rt.post({ action: 'ai', token: a, system: 's', user: 'u', maxTokens: 999999 });
  assert.strictEqual(JSON.parse(rt.calls.fetch[0].o.payload).max_tokens, 4000);
  assert.ok(!JSON.stringify(r).includes('sk-test'));
  assert.strictEqual(rt.calls.fetch[0].o.headers['x-api-key'], 'sk-test');
});
t('IA: sin ANTHROPIC_API_KEY devuelve error claro y no consume cupo', () => {
  const rt = fresh({ ANTHROPIC_API_KEY: '' }); const a = login(rt, 'ana@example.com').token;
  assert.strictEqual(rt.post({ action: 'ai', token: a, system: 's', user: 'u' }).code, 'setup');
  assert.strictEqual(rt.post({ action: 'load', token: a }).usage.ai.used, 0);
});
t('transcribe: funciona, tiene su propio cupo y no gasta el de generación', () => {
  const rt = fresh(); const a = login(rt, 'ana@example.com').token;
  const r = rt.post({ action: 'transcribe', token: a, audio: Buffer.from('abc').toString('base64'), mime: 'audio/webm' });
  assert.ok(r.ok && r.text === 'texto transcrito' && r.usage.ai.used === 0 && r.usage.stt.used === 1);
  rt.post({ action: 'transcribe', token: a, audio: 'YWJj' });
  assert.strictEqual(rt.post({ action: 'transcribe', token: a, audio: 'YWJj' }).code, 'limit');
});
t('acción desconocida y JSON roto devuelven error, no excepción', () => {
  const rt = fresh(); const a = login(rt, 'ana@example.com').token;
  assert.strictEqual(rt.post({ action: 'borrar', token: a }).code, 'bad');
  assert.strictEqual(JSON.parse(rt.g.doPost({ postData: { contents: '{roto' } }).getContent()).ok, false);
});
// ---------- Auto-registro y pruebas gratuitas ----------
const auto = (props) => fresh(Object.assign({ AUTO_REGISTER: 'SI' }, props));
const ask = (rt, tk) => rt.post({ action: 'ai', token: tk, system: 's', user: 'u' });
const userRows = (rt) => rt.tabs.Usuarios.cells.slice(1).filter((r) => r && r[0]);

t('auto-registro: un correo nuevo entra sin aprobación y queda guardado en el Sheet', () => {
  const rt = auto(); const before = userRows(rt).length;
  const r = login(rt, 'Nueva.Persona@Example.com');
  assert.ok(r.ok && r.user.trial === true && r.usage.ai.limit === 2 && r.usage.ai.total === true);
  const rows = userRows(rt); assert.strictEqual(rows.length, before + 1);
  const row = rows[rows.length - 1]; assert.strictEqual(row[0], 'nueva.persona@example.com'); assert.strictEqual(row[2], 'SI'); assert.strictEqual(row[6], 'prueba');
  login(rt, 'nueva.persona@example.com'); assert.strictEqual(userRows(rt).length, before + 1, 'no duplica');
});
t('prueba: 2 usos EN TOTAL (no por día) y luego se bloquea con mensaje claro', () => {
  const rt = auto(); const tk = login(rt, 'visita@example.com').token;
  assert.ok(ask(rt, tk).ok); const r2 = ask(rt, tk); assert.ok(r2.ok);
  assert.strictEqual(r2.usage.ai.used, 2);
  const r3 = ask(rt, tk); assert.strictEqual(r3.code, 'limit'); assert.match(r3.error, /pruebas gratuitas/);
  assert.strictEqual(rt.calls.fetch.length, 2);
  assert.ok(rt.tabs.Uso.cells.some((r) => r && r[0] === 'TOTAL' && r[1] === 'visita@example.com' && r[3] === 2));
  const tk2 = login(rt, 'visita@example.com').token; assert.strictEqual(ask(rt, tk2).code, 'limit');
});
t('prueba: alias del mismo correo (+etiqueta, puntos de Gmail) comparten el cupo', () => {
  const rt = auto(); const a = login(rt, 'mel.bauto@gmail.com').token;
  ask(rt, a); ask(rt, a);
  const b = login(rt, 'melbauto+otra@gmail.com').token, c = login(rt, 'M.E.L.Bauto@googlemail.com').token;
  assert.strictEqual(ask(rt, b).code, 'limit'); assert.strictEqual(ask(rt, c).code, 'limit');
  assert.strictEqual(userRows(rt).filter((r) => r[6] === 'prueba').length, 1);
});
t('prueba: no puede subir audio (no gasta OpenAI)', () => {
  const rt = auto(); const tk = login(rt, 'visita@example.com').token;
  assert.strictEqual(rt.post({ action: 'transcribe', token: tk, audio: 'YWJj' }).code, 'trial');
});
t('prueba: tope global diario de pruebas protege tus tokens y no gasta el cupo personal', () => {
  const rt = auto({ TRIAL_GLOBAL_DAILY_LIMIT: '3' });
  const tks = ['a@x.com', 'b@x.com', 'c@x.com'].map((e) => login(rt, e).token);
  assert.ok(ask(rt, tks[0]).ok); assert.ok(ask(rt, tks[0]).ok); assert.ok(ask(rt, tks[1]).ok);
  const blocked = ask(rt, tks[2]); assert.strictEqual(blocked.code, 'limit'); assert.match(blocked.error, /para todos/);
  assert.strictEqual(rt.post({ action: 'load', token: tks[2] }).usage.ai.used, 0);
});
t('prueba: tope de registros nuevos por día evita llenar el Sheet', () => {
  const rt = auto({ TRIAL_NEW_USERS_DAILY_LIMIT: '2' }); const before = userRows(rt).length;
  assert.ok(login(rt, 'a@x.com').ok); assert.ok(login(rt, 'b@x.com').ok);
  assert.strictEqual(login(rt, 'c@x.com').code, 'full'); assert.strictEqual(userRows(rt).length, before + 2);
  assert.ok(login(rt, 'a@x.com').ok, 'quien ya existe sigue entrando');
});
t('prueba: TRIAL_LIMIT configurable y AUTO_REGISTER=NO cierra el registro', () => {
  const rt = auto({ TRIAL_LIMIT: '1' }); const tk = login(rt, 'v@x.com').token;
  assert.ok(ask(rt, tk).ok); assert.strictEqual(ask(rt, tk).code, 'limit');
  assert.strictEqual(login(fresh({ AUTO_REGISTER: 'NO' }), 'nuevo@x.com').code, 'denied');
});
t('auto-registro no pisa a usuarios existentes: código obligatorio, bloqueados siguen bloqueados', () => {
  const rt = auto();
  assert.strictEqual(login(rt, 'secreto+truco@example.com').code, 'code');
  assert.strictEqual(login(rt, 'inactivo@example.com').code, 'denied');
  assert.strictEqual(login(rt, 'vip@example.com').usage.ai.total, false);
});
t('prueba: guarda y lee datos, con tope de elementos por colección', () => {
  const rt = auto(); const tk = login(rt, 'visita@example.com').token;
  assert.ok(rt.post({ action: 'save', token: tk, changes: { memory: [{ id: '1', json: '{}' }] } }).ok);
  const many = Array.from({ length: 101 }, (_, i) => ({ id: String(i), json: '{}' }));
  assert.strictEqual(rt.post({ action: 'save', token: tk, changes: { memory: many } }).code, 'bad');
});

// ---------- Resumen por correo ----------
const mailProps = { EMAIL_LINKEDIN_URL: 'https://www.linkedin.com/in/ejemplo', EMAIL_FROM_NAME: 'Melissa', SITE_URL: 'https://ejemplo.github.io/bip/', EMAIL_FOOTER_TEXT: 'Si te sirvió, conversemos.' };
function withPosts(rt, tk, n, extra) {
  const caps = [], posts = [];
  for (let i = 1; i <= n; i++) {
    caps.push({ id: 'c' + i, json: JSON.stringify({ id: 'c' + i, texto: 'Lo que escribí número ' + i + (extra || '') }) });
    posts.push({ id: 'p' + i, json: JSON.stringify({ id: 'p' + i, captureId: 'c' + i, estado: 'borrador', created: '2026-10-1' + i, formato: 'Honest Tradeoff', hook: 'Hook ' + i, cuerpo: 'Cuerpo del post ' + i + '\nsegunda línea' }) });
  }
  return rt.post({ action: 'save', token: tk, changes: { captures: caps, posts } });
}
t('correo: sin posts no se envía nada ni se gasta el único envío', () => {
  const rt = auto(mailProps); const tk = login(rt, 'visita@example.com').token;
  assert.strictEqual(rt.post({ action: 'send_summary', token: tk }).code, 'none'); assert.strictEqual(rt.calls.mail.length, 0);
  assert.strictEqual(rt.post({ action: 'load', token: tk }).usage.mail.sent, false);
});
t('correo: envía lo que escribió + los posts + tus redes, a su propia dirección', () => {
  const rt = auto(mailProps); const tk = login(rt, 'Visita+x@Example.com').token; withPosts(rt, tk, 2);
  const r = rt.post({ action: 'send_summary', token: tk });
  assert.ok(r.ok && r.count === 2 && r.usage.mail.sent === true && r.sentTo === 'visita@example.com');
  assert.strictEqual(rt.calls.mail.length, 1); const m = rt.calls.mail[0];
  assert.strictEqual(m.to, 'visita@example.com'); assert.strictEqual(m.subject, 'Tus posts de Building in Public'); assert.strictEqual(m.name, 'Melissa');
  for (const s of ['Lo que escribí número 1', 'Lo que escribí número 2', 'Hook 1', 'Cuerpo del post 2']) { assert.ok(m.body.includes(s), 'texto: ' + s); assert.ok(m.htmlBody.includes(s), 'html: ' + s); }
  assert.ok(m.htmlBody.includes('href="https://www.linkedin.com/in/ejemplo"') && m.body.includes('LinkedIn: https://www.linkedin.com/in/ejemplo'));
  assert.ok(m.body.includes('Si te sirvió, conversemos.') && m.htmlBody.includes('Seguir probando'));
});
t('correo: un solo envío por persona de prueba (no se puede usar para spamear)', () => {
  const rt = auto(mailProps); const tk = login(rt, 'visita@example.com').token; withPosts(rt, tk, 2);
  assert.ok(rt.post({ action: 'send_summary', token: tk }).ok);
  const again = rt.post({ action: 'send_summary', token: tk }); assert.strictEqual(again.code, 'sent'); assert.strictEqual(rt.calls.mail.length, 1);
  assert.strictEqual(rt.post({ action: 'send_summary', token: login(rt, 'visita+otro@example.com').token }).code, 'sent', 'el alias no da otro envío');
});
t('correo: el texto del usuario va escapado y no puede cambiar destinatario ni asunto', () => {
  const rt = auto(mailProps); const tk = login(rt, 'visita@example.com').token; withPosts(rt, tk, 1, ' <script>alert(1)</script> <a href="https://malo.com">x</a>');
  const r = rt.post({ action: 'send_summary', token: tk, to: 'victima@otro.com', subject: 'Gana dinero', html: '<b>hola</b>' });
  assert.ok(r.ok); const m = rt.calls.mail[0];
  assert.strictEqual(m.to, 'visita@example.com'); assert.strictEqual(m.subject, 'Tus posts de Building in Public');
  assert.ok(!m.htmlBody.includes('<script>') && !m.htmlBody.includes('href="https://malo.com"') && m.htmlBody.includes('&lt;script&gt;'));
  assert.ok(!m.htmlBody.includes('<b>hola</b>'));
});
t('correo: máximo 5 posts (los más recientes) y las redes inválidas se ignoran', () => {
  const rt = auto({ EMAIL_LINKEDIN_URL: 'javascript:alert(1)' }); const tk = login(rt, 'visita@example.com').token; withPosts(rt, tk, 7);
  rt.post({ action: 'send_summary', token: tk }); const m = rt.calls.mail[0];
  assert.ok(!m.body.includes('Hook 1\n') && !m.body.includes('Hook 2\n') && m.body.includes('Hook 7'));
  assert.ok(!m.htmlBody.includes('javascript:') && !m.body.includes('LinkedIn:'));
});
t('correo: tope diario global, EMAIL_ENABLED=NO y fallo de envío no gastan el cupo personal', () => {
  const rt = auto(Object.assign({ EMAIL_DAILY_LIMIT: '1' }, mailProps));
  const a = login(rt, 'a@x.com').token, b = login(rt, 'b@x.com').token; withPosts(rt, a, 1); withPosts(rt, b, 1);
  assert.ok(rt.post({ action: 'send_summary', token: a }).ok);
  const blocked = rt.post({ action: 'send_summary', token: b }); assert.strictEqual(blocked.code, 'limit');
  assert.strictEqual(rt.post({ action: 'load', token: b }).usage.mail.sent, false);
  const off = auto({ EMAIL_ENABLED: 'NO' }); const tk = login(off, 'v@x.com').token; withPosts(off, tk, 1);
  assert.strictEqual(off.post({ action: 'send_summary', token: tk }).code, 'mail');
  const bad = auto(mailProps); const t2 = login(bad, 'v@x.com').token; withPosts(bad, t2, 1); bad.setMailFail(true);
  assert.strictEqual(bad.post({ action: 'send_summary', token: t2 }).code, 'mail'); bad.setMailFail(false);
  assert.ok(bad.post({ action: 'send_summary', token: t2 }).ok, 'tras el fallo puede reintentar');
});
t('correo: cuota diaria de Google agotada se maneja con mensaje claro', () => {
  const rt = createRuntime({ props: { AUTO_REGISTER: 'SI' }, mailQuota: 0 }); rt.setup();
  const tk = login(rt, 'v@x.com').token; withPosts(rt, tk, 1);
  assert.strictEqual(rt.post({ action: 'send_summary', token: tk }).code, 'limit');
});
t('correo: usuarios manuales pueden pedirlo una vez al día; pruebas, una sola vez', () => {
  const rt = fresh(mailProps); const tk = login(rt, 'ana@example.com').token; withPosts(rt, tk, 1);
  assert.ok(rt.post({ action: 'send_summary', token: tk }).ok);
  assert.ok(rt.tabs.Uso.cells.some((r) => r && r[1] === 'ana@example.com' && r[2] === 'mail' && r[0] !== 'TOTAL'));
});
t('correo: sin sesión no se puede pedir', () => { assert.strictEqual(fresh().post({ action: 'send_summary' }).code, 'auth'); });

console.log('\n' + n + ' pruebas OK');
