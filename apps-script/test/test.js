// Pruebas de Code.gs con Google simulado. Uso: node apps-script/test/test.js
const assert = require('assert');
const { createRuntime } = require('./mock');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('✔', name); };

function fresh(props) {
  const rt = createRuntime({ props });
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
t('login: correo con formato inválido es rechazado', () => { assert.strictEqual(login(fresh(), 'no-es-correo').code, 'denied'); });
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
console.log('\n' + n + ' pruebas OK');
