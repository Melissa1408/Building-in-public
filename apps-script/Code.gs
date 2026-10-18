/**
 * Backend de Building in Public (Google Apps Script, contenedor de un Google Sheet).
 * Hace tres cosas: login por correo (con auto-registro de pruebas), base de datos en el Sheet
 * y proxy a la IA con límites. Las claves de la IA viven en Propiedades del script.
 * Pasos de instalación: ver DESPLIEGUE.md
 *
 * Tipos de usuario (pestaña Usuarios, columna "origen"):
 *  - prueba  → se crea sola cuando alguien escribe su correo. Total de TRIAL_LIMIT usos (2), sin audio.
 *  - (vacío) → lo agregas tú a mano. Límite diario (DAILY_AI_LIMIT o limite_diario) y código opcional.
 */

var TABS = { USERS: 'Usuarios', USE: 'Uso', DATA: 'Datos' };
var HEADERS = {
  Usuarios: ['correo', 'nombre', 'activo', 'limite_diario', 'codigo', 'creado', 'origen'],
  Uso: ['fecha', 'correo', 'tipo', 'conteo'],
  Datos: ['correo', 'coleccion', 'id', 'resumen', 'json', 'actualizado']
};
var COLLECTIONS = ['doc', 'memory', 'captures', 'posts', 'feedback', 'abiertos'];
var MAX_SYSTEM = 60000, MAX_USER = 20000, MAX_TOKENS = 4000;
var MAX_CELL = 49000, MAX_ITEMS = 2000, MAX_ITEMS_TRIAL = 100, MAX_AUDIO_B64 = 14000000;
var TOKEN_DAYS = 30;

// ---------- Utilidades ----------
function prop_(k, d) { var v = PropertiesService.getScriptProperties().getProperty(k); return v ? v : d; }
function num_(k, d) { var n = parseInt(prop_(k, ''), 10); return isNaN(n) ? d : n; }
function fail_(code, msg) { var e = new Error(msg); e.code = code; return e; }
function ss_() { var id = prop_('SHEET_ID', ''); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw fail_('setup', 'Falta la pestaña "' + name + '". Ejecuta setupSheets() en Apps Script.');
  return sh;
}
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function dateStr_(v) { return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v); }
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
/** Forma canónica: quita "+etiqueta" y, en Gmail, los puntos. Evita crear pruebas infinitas con alias de un mismo correo. */
function canonEmail_(e) {
  e = normEmail_(e);
  var at = e.lastIndexOf('@'); if (at < 1) return e;
  var local = e.slice(0, at).split('+')[0], dom = e.slice(at + 1);
  if (dom === 'gmail.com' || dom === 'googlemail.com') { local = local.replace(/\./g, ''); dom = 'gmail.com'; }
  return local + '@' + dom;
}
/** Debe empezar con letra o número (evita que una celda se interprete como fórmula). */
function validEmail_(e) { return e.length <= 120 && /^[a-z0-9][^\s@]*@[^\s@]+\.[^\s@]+$/.test(e); }
function withLock_(fn) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function rows_(name) { var v = sheet_(name).getDataRange().getValues(); v.shift(); return v; }
function safeText_(s) { s = String(s == null ? '' : s); return /^[=+\-@]/.test(s) ? "'" + s : s; }

/** Ejecuta esto (menú Ejecutar → setupSheets) para crear/actualizar las pestañas. Es seguro repetirlo: no borra datos. */
function setupSheets() {
  var ss = ss_();
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var h = HEADERS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
    if (name === 'Uso') sh.getRange(1, 1, 1000, 1).setNumberFormat('@');
    if (name === 'Usuarios') sh.getRange(1, 1, 1000, h.length).setNumberFormat('@');
    if (name === 'Datos') sh.getRange(1, 1, 5000, h.length).setNumberFormat('@');
  });
  return 'OK: pestañas Usuarios, Uso y Datos listas.';
}

// ---------- Usuarios y sesión ----------
function findUser_(email) {
  var v = sheet_(TABS.USERS).getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (canonEmail_(v[i][0]) === email) {
      var lim = parseInt(v[i][3], 10);
      return {
        email: email, nombre: String(v[i][1] || '').trim(),
        activo: String(v[i][2] || '').trim().toUpperCase() !== 'NO',
        limite: isNaN(lim) ? 0 : lim, codigo: String(v[i][4] || '').trim(),
        trial: String(v[i][6] || '').trim().toLowerCase() === 'prueba'
      };
    }
  }
  return null;
}
/** Registra automáticamente un correo nuevo como usuario de prueba (sin aprobación). */
function registerTrial_(email) {
  return withLock_(function () {
    var existing = findUser_(email); if (existing) return existing;
    var n = usageGet_('*reg', 'reg').n;
    if (n >= num_('TRIAL_NEW_USERS_DAILY_LIMIT', 50)) throw fail_('full', 'Hoy se alcanzó el máximo de registros de prueba. Vuelve mañana.');
    sheet_(TABS.USERS).appendRow([email, '', 'SI', '', '', new Date().toISOString(), 'prueba']);
    usageSet_('*reg', 'reg', n + 1);
    return findUser_(email);
  });
}
function secret_() {
  var s = prop_('TOKEN_SECRET', '');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); PropertiesService.getScriptProperties().setProperty('TOKEN_SECRET', s); }
  return s;
}
function hex_(bytes) { return bytes.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join(''); }
function sign_(payload) { return hex_(Utilities.computeHmacSha256Signature(payload, secret_())); }
function makeToken_(email) {
  var payload = email + '|' + (Date.now() + TOKEN_DAYS * 86400000);
  return Utilities.base64EncodeWebSafe(payload) + '.' + sign_(payload);
}
function authUser_(token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 2) throw fail_('auth', 'Sesión no válida. Vuelve a entrar.');
  var payload;
  try { payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString(); } catch (e) { throw fail_('auth', 'Sesión no válida. Vuelve a entrar.'); }
  if (sign_(payload) !== parts[1]) throw fail_('auth', 'Sesión no válida. Vuelve a entrar.');
  var p = payload.split('|');
  if (Number(p[1]) < Date.now()) throw fail_('auth', 'Tu sesión venció. Vuelve a entrar.');
  var user = findUser_(p[0]);
  if (!user || !user.activo) throw fail_('auth', 'Tu acceso ya no está activo.');
  return user;
}

// ---------- Límites de uso ----------
// Usuarios manuales: contador diario (fecha = hoy). Usuarios de prueba: contador total (fecha = "TOTAL").
function dayFor_(user) { return user.trial ? 'TOTAL' : today_(); }
function usageRows_() { return sheet_(TABS.USE).getDataRange().getValues(); }
function usageGet_(email, tipo, day) {
  var v = usageRows_(), d = day || today_();
  for (var i = 1; i < v.length; i++) {
    if (dateStr_(v[i][0]) === d && normEmail_(v[i][1]) === email && v[i][2] === tipo) return { row: i + 1, n: Number(v[i][3]) || 0 };
  }
  return { row: 0, n: 0 };
}
function usageSet_(email, tipo, n, day) {
  var d = day || today_(), cur = usageGet_(email, tipo, d), sh = sheet_(TABS.USE);
  if (cur.row) sh.getRange(cur.row, 4, 1, 1).setValues([[n]]);
  else sh.appendRow([d, email, tipo, n]);
}
function limitFor_(user, tipo) {
  if (user.trial) return tipo === 'stt' ? 0 : num_('TRIAL_LIMIT', 2);
  if (tipo === 'stt') return num_('DAILY_TRANSCRIBE_LIMIT', 2);
  return user.limite > 0 ? user.limite : num_('DAILY_AI_LIMIT', 2);
}
function usageInfo_(user) {
  var day = dayFor_(user);
  return {
    ai: { used: usageGet_(user.email, 'ai', day).n, limit: limitFor_(user, 'ai'), total: !!user.trial },
    stt: { used: usageGet_(user.email, 'stt', day).n, limit: limitFor_(user, 'stt') },
    mail: { sent: usageGet_(user.email, 'mail', day).n > 0 }
  };
}
/** Reserva un uso antes de llamar a la IA; si la llamada falla se libera. Nada se descuenta si algún tope bloquea. */
function reserve_(user, tipo) {
  return withLock_(function () {
    var day = dayFor_(user), limit = limitFor_(user, tipo), cur = usageGet_(user.email, tipo, day).n;
    if (cur >= limit) {
      throw fail_('limit', user.trial ? 'Ya usaste tus ' + limit + ' pruebas gratuitas.'
        : 'Llegaste al límite de ' + limit + (tipo === 'ai' ? ' generaciones' : ' transcripciones') + ' por hoy. Vuelve mañana.');
    }
    var t = 0, g = 0;
    if (tipo === 'ai') {
      if (user.trial) {
        t = usageGet_('*trial', 'ai').n;
        if (t >= num_('TRIAL_GLOBAL_DAILY_LIMIT', 30)) throw fail_('limit', 'Hoy se agotaron las pruebas gratuitas para todos. Vuelve mañana.');
      }
      g = usageGet_('*', 'ai').n;
      if (g >= num_('GLOBAL_DAILY_AI_LIMIT', 200)) throw fail_('limit', 'El servicio alcanzó su límite diario. Intenta mañana.');
      if (user.trial) usageSet_('*trial', 'ai', t + 1);
      usageSet_('*', 'ai', g + 1);
    }
    usageSet_(user.email, tipo, cur + 1, day);
    return cur + 1;
  });
}
function release_(user, tipo) {
  withLock_(function () {
    var day = dayFor_(user), cur = usageGet_(user.email, tipo, day).n;
    usageSet_(user.email, tipo, Math.max(0, cur - 1), day);
    if (tipo === 'ai') {
      usageSet_('*', 'ai', Math.max(0, usageGet_('*', 'ai').n - 1));
      if (user.trial) usageSet_('*trial', 'ai', Math.max(0, usageGet_('*trial', 'ai').n - 1));
    }
  });
}

// ---------- Acciones ----------
function userInfo_(user) { return { email: user.email, nombre: user.nombre, trial: user.trial }; }

function login_(req) {
  var email = canonEmail_(req.email);
  if (!validEmail_(email)) throw fail_('invalid', 'Escribe un correo válido.');
  var user = findUser_(email);
  if (!user) {
    if (prop_('AUTO_REGISTER', 'SI').toUpperCase() === 'NO') throw fail_('denied', 'Ese correo no tiene acceso. Pide que lo agreguen a la lista.');
    user = registerTrial_(email);
  }
  if (!user.activo) throw fail_('denied', 'Ese correo no tiene acceso. Pide que lo agreguen a la lista.');
  if (user.codigo && String(req.codigo || '').trim() !== user.codigo) throw fail_('code', 'El código de acceso no es correcto.');
  return { ok: true, token: makeToken_(email), user: userInfo_(user), usage: usageInfo_(user) };
}

function load_(user) {
  var out = {}, any = false;
  COLLECTIONS.forEach(function (c) { out[c] = []; });
  rows_(TABS.DATA).forEach(function (r) {
    if (normEmail_(r[0]) === user.email && out[r[1]]) { out[r[1]].push({ id: String(r[2]), json: String(r[4]) }); any = true; }
  });
  return { ok: true, empty: !any, collections: out, user: userInfo_(user), usage: usageInfo_(user) };
}

function save_(user, req) {
  var changes = req.changes || {}, colls = Object.keys(changes), maxItems = user.trial ? MAX_ITEMS_TRIAL : MAX_ITEMS;
  colls.forEach(function (c) {
    if (COLLECTIONS.indexOf(c) < 0) throw fail_('bad', 'Colección no válida: ' + c);
    if (!Array.isArray(changes[c]) || changes[c].length > maxItems) throw fail_('bad', 'Demasiados elementos en ' + c);
    changes[c].forEach(function (it) {
      if (!it || typeof it.id !== 'string' || typeof it.json !== 'string') throw fail_('bad', 'Dato mal formado en ' + c);
      if (it.json.length > MAX_CELL) throw fail_('big', 'Un elemento de "' + c + '" es demasiado largo para guardarse (máx. ' + MAX_CELL + ' caracteres).');
    });
  });
  withLock_(function () {
    var sh = sheet_(TABS.DATA), last = sh.getLastRow();
    var kept = [];
    if (last > 1) {
      sh.getRange(2, 1, last - 1, 6).getValues().forEach(function (r) {
        if (!(normEmail_(r[0]) === user.email && colls.indexOf(r[1]) >= 0)) kept.push(r);
      });
    }
    var now = new Date().toISOString(), add = [];
    colls.forEach(function (c) {
      changes[c].forEach(function (it) { add.push([user.email, c, it.id, safeText_(it.json.slice(0, 90)), it.json, now]); });
    });
    var all = kept.concat(add);
    if (last > 1) sh.getRange(2, 1, last - 1, 6).clearContent();
    if (all.length) { sh.getRange(2, 1, all.length, 6).setNumberFormat('@'); sh.getRange(2, 1, all.length, 6).setValues(all); }
  });
  return { ok: true, saved: colls };
}

function callClaude_(system, prompt, maxTokens) {
  var key = prop_('ANTHROPIC_API_KEY', '');
  if (!key) throw fail_('setup', 'Falta ANTHROPIC_API_KEY en el servidor.');
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: prop_('ANTHROPIC_MODEL', 'claude-sonnet-5-5'), max_tokens: maxTokens, system: system, messages: [{ role: 'user', content: prompt }] })
  });
  var body = {}; try { body = JSON.parse(res.getContentText()); } catch (e) {}
  if (res.getResponseCode() !== 200) throw fail_('ai', 'La IA respondió con error (' + res.getResponseCode() + '): ' + ((body.error && body.error.message) || 'sin detalle'));
  return (body.content || []).map(function (b) { return b.text || ''; }).join('');
}

function ai_(user, req) {
  var system = String(req.system || ''), prompt = String(req.user || '');
  if (!prompt || system.length > MAX_SYSTEM || prompt.length > MAX_USER) throw fail_('bad', 'La petición es demasiado larga o está vacía.');
  var maxTokens = Math.min(parseInt(req.maxTokens, 10) || 3000, MAX_TOKENS);
  reserve_(user, 'ai');
  var text;
  try { text = callClaude_(system, prompt, maxTokens); } catch (e) { release_(user, 'ai'); throw e; }
  return { ok: true, text: text, usage: usageInfo_(user) };
}

function transcribe_(user, req) {
  if (user.trial) throw fail_('trial', 'La subida de audio no está disponible en la prueba. Usa el botón Dictar.');
  var b64 = String(req.audio || '');
  if (!b64 || b64.length > MAX_AUDIO_B64) throw fail_('bad', 'El audio está vacío o es demasiado grande (máx. ~10 MB).');
  var key = prop_('OPENAI_API_KEY', '');
  if (!key) throw fail_('setup', 'La transcripción de audio no está activada en el servidor. Usa el botón Dictar.');
  reserve_(user, 'stt');
  var text;
  try {
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), String(req.mime || 'audio/webm'), 'audio.webm');
    var res = UrlFetchApp.fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'post', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + key },
      payload: { file: blob, model: 'whisper-1', language: 'es' }
    });
    var body = {}; try { body = JSON.parse(res.getContentText()); } catch (e) {}
    if (res.getResponseCode() !== 200) throw fail_('ai', 'Error de transcripción (' + res.getResponseCode() + ')');
    text = body.text || '';
  } catch (e) { release_(user, 'stt'); throw e; }
  return { ok: true, text: text, usage: usageInfo_(user) };
}

// ---------- Resumen por correo ("descarga" para llevarse) ----------
// Se envía SOLO cuando la persona lo pide, a la dirección con la que entró, UNA vez (pruebas: una vez en total;
// usuarios manuales: una vez al día). El contenido sale de lo que ya está guardado en el Sheet, no de la petición.
var MAX_MAIL_POSTS = 5;

function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function br_(s) { return esc_(s).replace(/\r?\n/g, '<br>'); }
function safeUrl_(u) { u = String(u || '').trim(); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; }
function userItems_(user, coll) {
  var out = [];
  rows_(TABS.DATA).forEach(function (r) {
    if (normEmail_(r[0]) === user.email && r[1] === coll) { try { out.push(JSON.parse(r[4])); } catch (e) {} }
  });
  return out;
}
function reserveMail_(user) {
  withLock_(function () {
    var day = dayFor_(user);
    if (usageGet_(user.email, 'mail', day).n >= 1) throw fail_('sent', 'Ya te enviamos tus posts a ' + user.email + '. Revisa tu bandeja y la carpeta de spam.');
    var g = usageGet_('*', 'mail').n;
    if (g >= num_('EMAIL_DAILY_LIMIT', 30) || MailApp.getRemainingDailyQuota() <= 0) throw fail_('limit', 'Hoy se alcanzó el máximo de correos. Inténtalo mañana.');
    usageSet_('*', 'mail', g + 1);
    usageSet_(user.email, 'mail', 1, day);
  });
}
function releaseMail_(user) {
  withLock_(function () {
    usageSet_(user.email, 'mail', 0, dayFor_(user));
    usageSet_('*', 'mail', Math.max(0, usageGet_('*', 'mail').n - 1));
  });
}
function buildEmail_(user, posts, caps) {
  var from = prop_('EMAIL_FROM_NAME', 'Building in Public'), li = safeUrl_(prop_('EMAIL_LINKEDIN_URL', '')),
      site = safeUrl_(prop_('SITE_URL', '')), foot = prop_('EMAIL_FOOTER_TEXT', '');
  var hi = user.nombre ? 'Hola ' + user.nombre + ',' : 'Hola,';
  var intro = 'Aquí tienes lo que escribiste y los posts que generamos juntos. Cópialos y publícalos cuando quieras: son tuyos.';
  var text = [hi, '', intro, ''], html = [];
  posts.forEach(function (p, i) {
    var cap = caps[p.captureId], mine = cap ? String(cap.texto).slice(0, 1500) : '';
    var post = (p.hook ? p.hook + '\n\n' : '') + String(p.cuerpo || '').slice(0, 3000);
    text.push('─── Post ' + (i + 1) + (p.formato ? ' · ' + p.formato : '') + ' ───');
    if (mine) text.push('LO QUE ESCRIBISTE:', mine, '');
    text.push('POST GENERADO:', post, '');
    html.push('<div style="margin:0 0 22px"><div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#6a7380;margin:0 0 8px">Post ' + (i + 1) + (p.formato ? ' · ' + esc_(p.formato) : '') + '</div>'
      + (mine ? '<div style="font-size:12px;color:#6a7380;margin:0 0 4px">Lo que escribiste</div><div style="background:#f6f7f9;border-radius:8px;padding:12px 14px;font-size:14px;color:#444;margin:0 0 12px">' + br_(mine) + '</div>' : '')
      + '<div style="font-size:12px;color:#6a7380;margin:0 0 4px">Post generado</div><div style="border:1px solid #e1e5ea;border-left:4px solid #2f5bea;border-radius:8px;padding:14px 16px;font-size:15px;line-height:1.55;color:#1b1f24">' + br_(post) + '</div></div>');
  });
  var links = [];
  if (li) links.push('<a href="' + li + '" style="color:#2f5bea">LinkedIn</a>');
  if (site) links.push('<a href="' + site + '" style="color:#2f5bea">Seguir probando</a>');
  text.push('—', from);
  if (foot) text.push(foot);
  if (li) text.push('LinkedIn: ' + li);
  if (site) text.push('Seguir probando: ' + site);
  text.push('', 'Recibiste este correo porque esta dirección se usó en Building in Public. Si no fuiste tú, ignóralo: no volverás a recibir nada.');
  var body = '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1b1f24">'
    + '<h2 style="margin:0 0 6px;font-size:20px">Tus posts de Building in Public</h2>'
    + '<p style="margin:0 0 22px;color:#444;font-size:15px">' + esc_(hi) + '<br>' + esc_(intro) + '</p>' + html.join('')
    + '<hr style="border:0;border-top:1px solid #e1e5ea;margin:26px 0 16px">'
    + '<p style="margin:0 0 4px;font-size:15px"><strong>' + esc_(from) + '</strong></p>'
    + (foot ? '<p style="margin:0 0 6px;font-size:14px;color:#444">' + br_(foot) + '</p>' : '')
    + (links.length ? '<p style="margin:0 0 14px;font-size:14px">' + links.join(' · ') + '</p>' : '')
    + '<p style="margin:0;font-size:12px;color:#8a93a0">Recibiste este correo porque esta dirección se usó en Building in Public. Si no fuiste tú, ignóralo: no volverás a recibir nada.</p></div>';
  return { subject: 'Tus posts de Building in Public', text: text.join('\n'), html: body, name: from };
}
function sendSummary_(user) {
  if (prop_('EMAIL_ENABLED', 'SI').toUpperCase() === 'NO') throw fail_('mail', 'El envío por correo no está disponible por ahora.');
  var posts = userItems_(user, 'posts').filter(function (p) { return p && p.estado !== 'descartado' && (p.hook || p.cuerpo); });
  if (!posts.length) throw fail_('none', 'Todavía no has generado ningún post.');
  posts.sort(function (a, b) { return String(a.created || '').localeCompare(String(b.created || '')); });
  posts = posts.slice(-MAX_MAIL_POSTS);
  var caps = {}; userItems_(user, 'captures').forEach(function (c) { if (c && c.id) caps[c.id] = c; });
  reserveMail_(user);
  try {
    var m = buildEmail_(user, posts, caps), opts = { to: user.email, subject: m.subject, body: m.text, htmlBody: m.html, name: m.name };
    var reply = normEmail_(prop_('EMAIL_REPLY_TO', '')); if (validEmail_(reply)) opts.replyTo = reply;
    MailApp.sendEmail(opts);
  } catch (e) { releaseMail_(user); throw fail_('mail', 'No se pudo enviar el correo. Inténtalo más tarde.'); }
  return { ok: true, sentTo: user.email, count: posts.length, usage: usageInfo_(user) };
}

function route_(req) {
  if (req.action === 'login') return login_(req);
  var user = authUser_(req.token);
  switch (req.action) {
    case 'load': return load_(user);
    case 'save': return save_(user, req);
    case 'ai': return ai_(user, req);
    case 'transcribe': return transcribe_(user, req);
    case 'send_summary': return sendSummary_(user);
    default: throw fail_('bad', 'Acción desconocida.');
  }
}

function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return json_({ ok: true, service: 'building-in-public' }); }
function doPost(e) {
  var out;
  try { out = route_(JSON.parse(e.postData.contents)); }
  catch (err) { out = { ok: false, code: err.code || 'error', error: err.code ? err.message : 'Error interno: ' + err.message }; }
  return json_(out);
}
