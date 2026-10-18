// Dashboard Building in Public. Login por correo; los datos viven en Google Sheets (vía Apps Script) y la IA corre en el servidor.
(function () {
  const D = KB.defaults;
  const uid = () => Math.random().toString(36).slice(2, 10);
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => iso(new Date());
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const ESTADOS = ['borrador', 'editado', 'publicado'];
  const TIPOS = ['Descubrimiento', 'Decisión', 'Estado'];

  function defaults() {
    return {
      v: 2,
      settings: { lang: 'es-419', slots: JSON.parse(JSON.stringify(D.slots)) },
      profile: { ...D.profile }, brief: D.brief, pilares: [...D.pilares],
      audiences: JSON.parse(JSON.stringify(D.audiencias)), constraints: [...D.constraints],
      memory: [], abiertos: D.abiertos.map((a) => ({ id: uid(), ...a, resuelto: false })),
      captures: [], posts: [], feedback: [], ejemplos: ''
    };
  }
  let S = defaults();
  let session = null;
  const SKEY = 'bip.session', LEGACY = 'bip.v1';
  const LISTS = ['memory', 'captures', 'posts', 'feedback', 'abiertos'];
  let lastSent = {};

  function ensureIds() { LISTS.forEach((c) => S[c].forEach((x) => { if (!x.id) x.id = uid(); })); }
  function packState() {
    const out = {};
    out.doc = [
      { id: 'profile', json: JSON.stringify(S.profile) },
      { id: 'config', json: JSON.stringify({ brief: S.brief, pilares: S.pilares, constraints: S.constraints, audiences: S.audiences, ejemplos: S.ejemplos, slots: S.settings.slots, lang: S.settings.lang }) }
    ];
    LISTS.forEach((c) => { out[c] = S[c].map((x) => ({ id: x.id, json: JSON.stringify(x) })); });
    return out;
  }
  function unpack(cols) {
    const s = defaults();
    (cols.doc || []).forEach((d) => {
      try {
        const v = JSON.parse(d.json);
        if (d.id === 'profile') s.profile = Object.assign(s.profile, v);
        if (d.id === 'config') {
          ['brief', 'pilares', 'constraints', 'audiences', 'ejemplos'].forEach((k) => { if (v[k] != null) s[k] = v[k]; });
          if (v.slots) s.settings.slots = v.slots;
          if (v.lang) s.settings.lang = v.lang;
        }
      } catch (e) { /* fila dañada: se ignora */ }
    });
    LISTS.forEach((c) => { s[c] = (cols[c] || []).map((r) => { try { return JSON.parse(r.json); } catch (e) { return null; } }).filter(Boolean); });
    return s;
  }
  function markSynced() { lastSent = {}; const cur = packState(); Object.keys(cur).forEach((c) => { lastSent[c] = JSON.stringify(cur[c]); }); }

  let syncTimer = null, syncing = false, again = false;
  function paintSync() {
    const el = $('#sync'); if (!el) return;
    const m = { idle: '', pending: 'Guardando…', saving: 'Guardando…', ok: '☁ Guardado en Google Sheets', error: '⚠ Sin guardar · reintentar' };
    el.textContent = m[ui.sync] || ''; el.className = 'sync ' + ui.sync;
  }
  function save() {
    if (!session || !ui.ready) return;
    ui.sync = 'pending'; paintSync(); clearTimeout(syncTimer); syncTimer = setTimeout(doSync, 1200);
  }
  async function doSync() {
    if (!session || !ui.ready) return;
    clearTimeout(syncTimer);
    if (syncing) { again = true; return; }
    const cur = packState(), changes = {}, sers = {};
    Object.keys(cur).forEach((c) => { const ser = JSON.stringify(cur[c]); if (ser !== lastSent[c]) { changes[c] = cur[c]; sers[c] = ser; } });
    if (!Object.keys(changes).length) { ui.sync = 'ok'; return paintSync(); }
    syncing = true; ui.sync = 'saving'; paintSync();
    try { await API.call('save', { changes }); Object.assign(lastSent, sers); ui.sync = 'ok'; }
    catch (e) { ui.sync = 'error'; handleErr(e); }
    syncing = false; paintSync();
    if (again) { again = false; save(); }
  }
  window.addEventListener('beforeunload', (e) => { if (ui.sync === 'pending' || ui.sync === 'saving') { e.preventDefault(); e.returnValue = ''; } });

  async function pullState() {
    const d = await API.call('load');
    ui.usage = d.usage; session.nombre = d.user.nombre; session.trial = !!d.user.trial;
    if (d.empty) {
      S = defaults(); if (d.user.nombre) S.profile.nombre = d.user.nombre;
      lastSent = {}; ui.ready = true; save();       // cuenta nueva: sube la base inicial
    } else { S = unpack(d.collections); ensureIds(); markSynced(); ui.ready = true; }
  }
  async function bootstrap() {
    try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
    if (session && !(window.BIP_CONFIG || {}).API_URL) session = null;
    if (!session) return render();
    API.token = session.token; ui.ready = false; ui.bootError = ''; render();
    try { await pullState(); } catch (e) { if (e.code === 'auth') { logout(true); toast(e.message); return; } ui.bootError = e.message; }
    render();
  }
  async function login() {
    const email = ($('#lgEmail').value || '').trim(), codigo = ($('#lgCode').value || '').trim(), msg = $('#lgMsg'), btn = $('#lgBtn');
    if (!email) { msg.textContent = 'Escribe tu correo.'; return; }
    msg.textContent = 'Verificando…'; btn.disabled = true; API.token = '';
    try {
      const r = await API.call('login', { email, codigo });
      session = { token: r.token, email: r.user.email, nombre: r.user.nombre, trial: !!r.user.trial }; API.token = r.token; ui.usage = r.usage; ui.ready = false;
      msg.textContent = 'Cargando tus datos…';
      try { await pullState(); } catch (e) { session = null; API.token = ''; throw e; }
      try { localStorage.setItem(SKEY, JSON.stringify(session)); } catch (e) { /* sin sesión persistente */ }
      ui.tab = 'hoy'; render();
    } catch (e) {
      msg.textContent = e.message; btn.disabled = false;
      if (e.code === 'code') $('#lgCodeWrap').hidden = false;
    }
  }
  async function logout(silent) {
    if (!silent && (ui.sync === 'pending' || ui.sync === 'saving')) await doSync();
    session = null; API.token = ''; ui.ready = false; ui.usage = null; ui.sync = 'idle'; ui.lastPostId = null; S = defaults(); lastSent = {};
    try { localStorage.removeItem(SKEY); } catch (e) { /* nada */ }
    render();
  }
  function handleErr(err) {
    if (err && err.code === 'auth') { logout(true); toast(err.message); return; }
    toast(err && err.message ? err.message : 'Ocurrió un error.');
  }

  const ui = { ready: false, bootError: '', usage: null, sync: 'idle', tab: 'hoy', weekOffset: 0, monthOffset: 0, calView: 'mes', focus: null, busy: false, lastPostId: null, filtro: 'todos' };

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3500);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('Copiado. Pégalo en LinkedIn.');
  }

  // ---------- Fechas / calendario ----------
  function weekStart(offset) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7; // lunes = 0
    d.setDate(d.getDate() - dow + offset * 7); return d;
  }
  function weekSlots(offset) {
    const start = weekStart(offset);
    return S.settings.slots.slice().sort((a, b) => ((a.dow + 6) % 7) - ((b.dow + 6) % 7)).map((s) => {
      const d = new Date(start); d.setDate(start.getDate() + ((s.dow + 6) % 7));
      return { ...s, date: iso(d) };
    });
  }

  // ---------- Alertas ----------
  function alerts() {
    const out = [];
    const seq = S.posts.filter((p) => p.estado !== 'descartado').slice().sort((a, b) => (a.fechaPlan || a.created).localeCompare(b.fechaPlan || b.created));
    for (let i = 1; i < seq.length; i++) {
      if (seq[i].formato && seq[i].formato === seq[i - 1].formato) out.push({ t: 'warn', msg: `Rotación: dos posts seguidos con el formato "${seq[i].formato}".`, focus: seq[i].id });
      else if (seq[i].publico && seq[i].publico === seq[i - 1].publico) out.push({ t: 'info', msg: `Rotación: dos posts seguidos para "${seq[i].publico}".`, focus: seq[i].id });
    }
    S.abiertos.filter((a) => !a.resuelto).forEach((a) => out.push({ t: 'ask', msg: `Pendiente: ${a.pregunta}`, go: 'memoria' }));
    return out;
  }
  // Muestra 3 alertas y esconde el resto. Si no hay ninguna, no ocupa espacio.
  function alertsCard() {
    const a = alerts(); if (!a.length) return '';
    const li = (x, i) => `<li class="al ${x.t}" data-act="alert" data-i="${i}">${esc(x.msg)}</li>`;
    const rest = a.slice(3).map((x, i) => li(x, i + 3)).join('');
    return `<section class="card"><h3>Avisos</h3><ul class="alerts">${a.slice(0, 3).map(li).join('')}</ul>${rest ? `<details><summary>Ver ${a.length - 3} más</summary><ul class="alerts">${rest}</ul></details>` : ''}</section>`;
  }

  // ---------- Post card ----------
  function opts(list, val) { return list.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join(''); }
  function rows(t) { return Math.min(22, Math.max(4, String(t || '').split('\n').length + Math.ceil(String(t || '').length / 90))); }

  function postCard(p) {
    const open = (p.pendientes || []).filter((q) => !q.resuelto);
    const pend = open.length ? `<div class="pend"><strong>Para afinar el post (opcional, una frase por pregunta)</strong>
      ${open.map((q) => `<label>${esc(q.pregunta)}<input data-q="${q.id}" placeholder="Tu respuesta"></label>`).join('')}
      <div class="row wrap"><button class="btn sm primary" data-act="answer" data-id="${p.id}">Responder y mejorar · usa 1</button><button class="btn sm ghost" data-act="skipq" data-id="${p.id}">Dejarlo así</button></div></div>` : '';
    return `<article class="card post" id="post-${p.id}" data-id="${p.id}">
      <div class="badges"><span class="b ${p.estado}">${esc(p.estado)}</span><span class="b">${esc(p.formato || '—')}</span>
        ${p.tipo ? `<span class="b">${esc(p.tipo)}</span>` : ''}${p.fechaPlan ? `<span class="b">📅 ${esc(p.fechaPlan)}</span>` : ''}</div>
      <div class="grid4">
        <label>Formato<select data-f="formato">${opts(KB.formatos, p.formato)}</select></label>
        <label>Tipo<select data-f="tipo">${opts(TIPOS, p.tipo)}</select></label>
        <label>Estado<select data-f="estado">${opts(ESTADOS, p.estado)}</select></label>
        <label>Fecha planeada<input type="date" data-f="fechaPlan" value="${esc(p.fechaPlan || '')}"></label>
      </div>
      <label>Hook <span class="muted">(${esc(p.patronHook || 'sin patrón')})</span>
        <textarea data-f="hook" rows="2">${esc(p.hook)}</textarea></label>
      <label>Cuerpo <textarea data-f="cuerpo" rows="${rows(p.cuerpo)}">${esc(p.cuerpo)}</textarea></label>
      <details><summary>Por qué este formato · problema · público</summary>
        <p><strong>Por qué:</strong> ${esc(p.porque)}</p><p><strong>Problema:</strong> ${esc(p.problema)}</p>
        <label>Público<input data-f="publico" value="${esc(p.publico)}"></label></details>
      ${pend}
      <div class="row actions">
        <button class="btn primary" data-act="copy" data-id="${p.id}">Copiar post</button>
        <button class="btn" data-act="hook" data-id="${p.id}">Otro hook · usa 1</button>
        <button class="btn" data-act="publish" data-id="${p.id}">Marcar publicado</button>
        <button class="btn ghost danger" data-act="del" data-id="${p.id}">Eliminar</button>
      </div>
      <div class="row"><input data-fb="${p.id}" placeholder="¿Qué corregiste y por qué? (para que no se repita)"><button class="btn sm" data-act="fb" data-id="${p.id}">Guardar corrección</button></div>
    </article>`;
  }

  // ---------- Vistas ----------
  function viewLogin() {
    if (!(window.BIP_CONFIG || {}).API_URL) return `<section class="card login"><h2>Falta configurar el servidor</h2>
      <p>Esta página necesita la URL de tu Web App de Apps Script. Ábrela en <code>js/config.js</code> y pégala en <code>API_URL</code>. Los pasos están en <strong>DESPLIEGUE.md</strong>.</p></section>`;
    return `<section class="card login"><h2>Prueba el generador de posts</h2>
      <p class="muted">Escribe tu correo y empieza: sin contraseña y sin esperar aprobación. Tienes <strong>2 pruebas gratis</strong>. Guardamos tu correo solo para contarlas.</p>
      <label>Correo<input id="lgEmail" type="email" autocomplete="email" placeholder="tu@correo.com"></label>
      <label id="lgCodeWrap" hidden>Código de acceso<input id="lgCode" type="password" autocomplete="off"></label>
      <div class="row"><button class="btn primary" id="lgBtn" data-act="login">Empezar</button></div>
      <p id="lgMsg" class="muted"></p></section>`;
  }
  function viewLoading() {
    return ui.bootError
      ? `<section class="card login"><h3>No se pudieron cargar tus datos</h3><p>${esc(ui.bootError)}</p><div class="row"><button class="btn primary" data-act="retryload">Reintentar</button><button class="btn" data-act="logout">Salir</button></div></section>`
      : '<section class="card login"><p class="muted">Cargando tus datos…</p></section>';
  }
  function renderHeader() {
    const nav = $('nav'), bar = $('#userbar'), u = ui.usage;
    nav.hidden = !(session && ui.ready);
    bar.innerHTML = session ? `<span id="sync" class="sync"></span>${u ? (u.ai.total ? `<span class="b" title="Pruebas gratuitas con IA">Pruebas: ${Math.max(0, u.ai.limit - u.ai.used)} de ${u.ai.limit}</span>` : `<span class="b" title="Generaciones con IA de hoy">IA hoy: ${u.ai.used}/${u.ai.limit}</span>`) : ''}<span class="muted email">${esc(session.email)}</span><button class="btn sm ghost" data-act="logout">Salir</button>` : '';
    paintSync();
  }

  function limitText() {
    const u = ui.usage; if (!u) return '';
    return u.ai.total ? `Ya usaste tus ${u.ai.limit} pruebas gratuitas.` : `Llegaste al límite de ${u.ai.limit} generaciones por hoy. Vuelve mañana.`;
  }
  function limitBanner() {
    const u = ui.usage; if (!u || u.ai.used < u.ai.limit) return '';
    const c = window.BIP_CONFIG || {};
    const link = c.CONTACT_URL && /^https:\/\//.test(c.CONTACT_URL) ? ` <a href="${esc(c.CONTACT_URL)}" target="_blank" rel="noopener">${esc(c.CONTACT_TEXT || 'Escríbeme')}</a>` : (c.CONTACT_TEXT ? ' ' + esc(c.CONTACT_TEXT) : '');
    return `<section class="card limit"><strong>${limitText()}</strong>${link}<p class="muted">Tus posts siguen aquí para copiar o editar.</p></section>`;
  }
  function viewHoy() {
    const last = S.posts.find((p) => p.id === ui.lastPostId);
    return `${limitBanner()}<section class="card">
      <h2>¿Qué aprendiste o decidiste hoy?</h2>
      <p class="muted">Cuéntalo como se lo contarías a alguien. Dicta, sube un audio o escribe. Mientras más natural, mejor suena el post.</p>
      ${!S.profile.proyecto ? `<label>¿Qué estás construyendo o aprendiendo? <span class="muted">(opcional; ayuda a que el post suene a ti)</span><input data-p="proyecto" placeholder="Ej.: una tienda online, mi primer bot, un curso de datos…"></label>` : ''}
      <textarea id="txt" rows="6" placeholder="Hoy descubrí que… / Decidí X en vez de Y porque…  (2 o 3 frases bastan)"></textarea>
      <div class="row wrap">
        <button class="btn" data-act="dictate" id="dictBtn">🎙 Dictar</button>
        ${session && session.trial ? '' : '<label class="btn file">Subir audio<input type="file" id="aud" accept="audio/*" hidden></label>'}
        <select id="tipoSel"><option value="">Tipo: automático</option>${TIPOS.map((t) => `<option>${t}</option>`).join('')}</select>
        <button class="btn primary" data-act="generate" id="genBtn">Generar post</button>
      </div>
      <p id="status" class="muted"></p>
    </section>
    ${last ? `<h3>Tu post</h3>${postCard(last)}` : ''}
    `;
  }

  function viewSemana() {
    const slots = weekSlots(ui.weekOffset);
    const unplaced = S.posts.filter((p) => !p.fechaPlan && p.estado !== 'publicado');
    const label = slots.length ? `${slots[0].date} → ${slots[slots.length - 1].date}` : '';
    return `<div class="row between"><h2>Calendario semanal</h2>
      <div class="row"><button class="btn sm" data-act="week" data-d="-1">←</button><span>${label}</span><button class="btn sm" data-act="week" data-d="1">→</button><button class="btn sm ghost" data-act="week" data-d="0">Hoy</button></div></div>
      <div class="cal">${slots.map((s) => {
        const ps = S.posts.filter((p) => p.fechaPlan === s.date);
        return `<div class="slot" data-drop="${s.date}"><div class="slot-h"><strong>${DIAS[s.dow]}</strong> ${s.date.slice(5)}<span class="b">${esc(s.tipo)}</span></div>
          ${ps.map((p) => `<div class="chip ${p.estado}" draggable="true" data-drag="${p.id}" data-act="open" data-id="${p.id}"><strong>${esc(p.formato)}</strong><br>${esc((p.hook || '').slice(0, 70))}</div>`).join('') || '<div class="muted empty">Hueco libre · arrastra un post aquí</div>'}
        </div>`; }).join('')}</div>
      <section class="card"><h3>Sin ubicar</h3>
      ${unplaced.map((p) => `<div class="chip ${p.estado}" draggable="true" data-drag="${p.id}" data-act="open" data-id="${p.id}"><strong>${esc(p.formato)}</strong> · ${esc((p.hook || '').slice(0, 80))}</div>`).join('') || '<p class="muted">Nada pendiente de ubicar.</p>'}</section>
      ${alertsCard()}`;
  }

  function viewMes() {
    const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth() + ui.monthOffset, 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const slotDows = S.settings.slots.map((s) => s.dow);
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const k = iso(d);
      if (i >= 35 && d.getMonth() !== first.getMonth()) break;
      const ps = S.posts.filter((x) => x.fechaPlan === k);
      const slot = S.settings.slots.find((s) => s.dow === d.getDay());
      cells += `<div class="cell ${d.getMonth() !== first.getMonth() ? 'out' : ''} ${slotDows.includes(d.getDay()) ? 'slotday' : ''} ${k === today() ? 'hoy' : ''}" data-drop="${k}">
        <div class="dn">${d.getDate()}${slot ? `<span class="st">${esc(slot.tipo.split(' ')[0])}</span>` : ''}</div>
        ${ps.map((x) => `<div class="chip ${x.estado}" draggable="true" data-drag="${x.id}" data-act="open" data-id="${x.id}">${esc(x.formato)}</div>`).join('')}</div>`;
    }
    const unplaced = S.posts.filter((x) => !x.fechaPlan && x.estado !== 'publicado');
    return `<div class="row between"><h2>${MES[first.getMonth()]} ${first.getFullYear()}</h2>
      <div class="row"><button class="btn sm" data-act="month" data-d="-1">←</button><button class="btn sm" data-act="month" data-d="1">→</button><button class="btn sm ghost" data-act="month" data-d="0">Hoy</button></div></div>
      <div class="mcal">${['L','M','X','J','V','S','D'].map((x) => `<div class="dh">${x}</div>`).join('')}${cells}</div>
      <p class="muted">Los días marcados son tus huecos de publicación. Arrastra un post a cualquier día.</p>
      <section class="card"><h3>Sin ubicar</h3>${unplaced.map((x) => `<div class="chip ${x.estado}" draggable="true" data-drag="${x.id}" data-act="open" data-id="${x.id}"><strong>${esc(x.formato)}</strong> · ${esc((x.hook || '').slice(0, 80))}</div>`).join('') || '<p class="muted">Nada pendiente de ubicar.</p>'}</section>
      ${alertsCard()}`;
  }
  function viewCalendario() {
    const tog = `<div class="row"><button class="btn sm ${ui.calView === 'mes' ? 'primary' : ''}" data-act="calview" data-v="mes">Mes</button><button class="btn sm ${ui.calView === 'semana' ? 'primary' : ''}" data-act="calview" data-v="semana">Semana</button></div>`;
    return tog + (ui.calView === 'mes' ? viewMes() : viewSemana());
  }

  function viewPosts() {
    let ps = S.posts.slice().reverse();
    if (ui.filtro !== 'todos') ps = ps.filter((p) => p.estado === ui.filtro);
    if (ui.focus) ps.sort((a, b) => (b.id === ui.focus) - (a.id === ui.focus));
    return `<div class="row between"><h2>Posts</h2><select data-act="filtro">${['todos', ...ESTADOS].map((e) => `<option ${e === ui.filtro ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
      ${ps.map(postCard).join('') || '<p class="muted">Todavía no hay posts. Empieza en Hoy.</p>'}`;
  }

  function legacyExists() { try { return !!localStorage.getItem(LEGACY); } catch (e) { return false; } }
  function viewMemoria() {
    const p = S.profile, st = S.settings;
    const f = (k, l, ta) => `<label>${l}${ta ? `<textarea data-p="${k}" rows="2">${esc(p[k])}</textarea>` : `<input data-p="${k}" value="${esc(p[k])}">`}</label>`;
    return `<h2>Memoria${p.nombre ? ' de ' + esc(p.nombre) : ''}</h2>
    <p class="muted">Aquí vive lo que el sistema sabe de ella. Cada vez que cuenta algo, esta memoria crece y los posts suenan más a ella.</p>
    <section class="card"><h3>Perfil</h3><div class="grid2">${f('nombre', 'Nombre')}${f('rol', 'Rol')}${f('nivel', 'Nivel de experiencia')}${f('etapa', 'Etapa del proyecto')}</div>
      ${f('proyecto', 'Proyecto', 1)}${f('tono', 'Voz y tono (cómo habla)', 1)}${f('noEs', 'Qué NO es (para no exagerar su expertise)', 1)}
      <label>Brief: por qué construye esto, su tesis, sus miedos, su visión de éxito<textarea data-k="brief" rows="4">${esc(S.brief)}</textarea></label>
      <label>Posts aprobados (ejemplos de calidad y de voz; pega los que ya le gustaron)<textarea data-k="ejemplos" rows="6">${esc(S.ejemplos)}</textarea></label>
      <label>Pilares (uno por línea)<textarea data-k="pilares" rows="2">${esc(S.pilares.join('\n'))}</textarea></label>
      <label>Restricciones de contenido (una por línea)<textarea data-k="constraints" rows="4">${esc(S.constraints.join('\n'))}</textarea></label></section>
    <section class="card"><h3>Público</h3>${S.audiences.map((a, i) => `<div class="grid3">
      <input data-a="${i}.nombre" value="${esc(a.nombre)}"><input data-a="${i}.busca" value="${esc(a.busca)}" placeholder="Qué busca"><input data-a="${i}.evitar" value="${esc(a.evitar)}" placeholder="Qué evitar"></div>`).join('')}</section>
    <section class="card"><h3>Datos abiertos (pendientes con ella)</h3>
      ${S.abiertos.map((a) => `<div class="pend ${a.resuelto ? 'done' : ''}"><strong>${esc(a.dato)}</strong><div>${esc(a.pregunta)}</div>
        ${a.resuelto ? `<div class="muted">Respuesta: ${esc(a.respuesta)}</div>` : `<div class="row"><input data-ab="${a.id}" placeholder="Respuesta"><button class="btn sm" data-act="abre" data-id="${a.id}">Guardar</button></div>`}</div>`).join('') || '<p class="muted">Nada abierto.</p>'}</section>
    <section class="card"><h3>Cerebro (${S.memory.length} notas · ${S.captures.length} transcripciones)</h3>
      <div class="row"><input id="memNew" placeholder="Agregar un dato sobre su proyecto, stack o forma de hablar"><button class="btn sm" data-act="memnew">Agregar</button></div>
      <ul class="mem">${S.memory.slice().reverse().map((m) => `<li><span>${esc(m.texto)}</span><button class="btn sm ghost danger" data-act="memdel" data-id="${m.id}">✕</button></li>`).join('')}</ul></section>
    <section class="card"><h3>Correcciones que ella hizo (${S.feedback.length})</h3>
      <ul class="mem">${S.feedback.slice().reverse().map((m) => `<li><span>${esc(m.texto)}</span><button class="btn sm ghost danger" data-act="fbdel" data-id="${m.id}">✕</button></li>`).join('')}</ul></section>
    <section class="card"><h3>Ajustes</h3><div class="grid2">
      <label>Idioma de dictado<select data-s="lang">${['es-419', 'es-MX', 'es-ES', 'es-CO', 'es-AR', 'en-US'].map((l) => `<option ${l === st.lang ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <h4>Cadencia (3 por semana)</h4>${st.slots.map((s, i) => `<div class="row"><select data-sl="${i}.dow">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}" ${d === s.dow ? 'selected' : ''}>${DIAS[d]}</option>`).join('')}</select><input data-sl="${i}.tipo" value="${esc(s.tipo)}"></div>`).join('')}
      <p class="muted">Todo se guarda solo en Google Sheets unos segundos después de cada cambio (mira el aviso arriba). Si quieres forzarlo:</p>
      <div class="row wrap"><button class="btn primary" data-act="syncnow">Guardar ahora</button><button class="btn" data-act="export">Exportar respaldo</button><label class="btn file">Importar respaldo<input type="file" id="imp" accept="application/json" hidden></label>${legacyExists() ? '<button class="btn" data-act="legacy">Importar datos de la versión anterior (este navegador)</button>' : ''}<button class="btn ghost danger" data-act="reset">Borrar todo</button></div>
      <p class="muted">Importar un respaldo sube esos datos a tu cuenta. Las claves de la IA ya no se guardan aquí: viven en el servidor.</p></section>`;
  }

  function render() {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === ui.tab));
    renderHeader();
    const v = !session ? viewLogin() : !ui.ready ? viewLoading() : { hoy: viewHoy, calendario: viewCalendario, posts: viewPosts, memoria: viewMemoria }[ui.tab]();
    // Conserva el texto que está escribiendo si se re-renderiza.
    const draft = $('#txt') ? $('#txt').value : '';
    $('#view').innerHTML = v;
    if (draft && $('#txt')) $('#txt').value = draft;
    if (ui.focus) { const el = $('#post-' + ui.focus); if (el) el.scrollIntoView({ block: 'start' }); ui.focus = null; }
  }
  function go(tab, focus) { ui.tab = tab; ui.focus = focus || null; render(); }

  // ---------- Generación ----------
  function applyResult(p, r) {
    p.formato = KB.formatos.includes(r.formato) ? r.formato : (KB.formatos.find((f) => f.toLowerCase().startsWith(String(r.formato || '').toLowerCase())) || KB.formatos[0]);
    p.tipo = TIPOS.includes(r.tipo) ? r.tipo : 'Descubrimiento';
    p.porque = r.porque || ''; p.problema = r.problema || ''; p.publico = r.publico || '';
    p.patronHook = r.patron_hook || ''; p.hook = r.hook || ''; p.cuerpo = r.cuerpo || '';
    p.completo = r.completo !== false;
    p.pendientes = (r.pendientes || []).map((q) => ({ id: uid(), dato: q.dato, pregunta: q.pregunta, resuelto: false }));
    p.memoriaSugerida = (r.memoria || []).map((t) => ({ t, added: false }));
    p.original = p.hook + '\n\n' + p.cuerpo;
  }
  // Los datos que la persona cuenta (stack, decisiones, cifras) se guardan solos en su memoria, sin botones.
  function autoMemory(p) {
    let n = 0;
    (p.memoriaSugerida || []).forEach((m) => {
      if (m.added) return; const t = String(m.t || '').trim(); if (!t) return;
      if (!S.memory.some((x) => String(x.texto).toLowerCase() === t.toLowerCase())) { S.memory.push({ id: uid(), fecha: today(), texto: t.slice(0, 300) }); n++; }
      m.added = true;
    });
    return n;
  }
  function setStatus(m) { const s = $('#status'); if (s) s.textContent = m; }
  async function generate() {
    const txt = ($('#txt').value || '').trim();
    if (txt.length < 30) return toast('Cuéntame un poco más (al menos un par de frases).');
    if (ui.usage && ui.usage.ai.used >= ui.usage.ai.limit) return toast(limitText());
    if (ui.busy) return; ui.busy = true; $('#genBtn').disabled = true; setStatus('Generando… (unos segundos)');
    try {
      const cap = { id: uid(), fecha: today(), texto: txt.slice(0, 40000) };
      const r = await AI.generatePost(S, txt, $('#tipoSel').value);
      const p = { id: uid(), captureId: cap.id, estado: 'borrador', created: new Date().toISOString(), fechaPlan: '' };
      applyResult(p, r);
      const nm = autoMemory(p); S.captures.push(cap); S.posts.push(p); save();
      ui.lastPostId = p.id; $('#txt').value = ''; ui.busy = false; render();
      toast((p.pendientes.length ? 'Post listo. Puedes afinarlo con 1-2 respuestas cortas.' : 'Post listo.') + (nm ? ' Guardé ' + nm + ' dato(s) en tu memoria.' : ''));
    } catch (e) { ui.busy = false; setStatus(''); handleErr(e); const b = $('#genBtn'); if (b) b.disabled = false; }
  }
  async function regenerate(p, extra) {
    const cap = S.captures.find((c) => c.id === p.captureId);
    if (cap) cap.texto += '\n\n' + extra;
    toast('Regenerando con tu respuesta…');
    const r = await AI.generatePost(S, cap ? cap.texto : extra, p.tipo);
    applyResult(p, r); const nm = autoMemory(p); save(); render(); toast('Post actualizado.' + (nm ? ' Guardé ' + nm + ' dato(s) en tu memoria.' : ''));
  }

  // ---------- Dictado ----------
  let rec = null;
  function dictate() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('Tu navegador no soporta dictado. Usa Chrome/Edge o sube un audio.');
    const btn = $('#dictBtn');
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = S.settings.lang; rec.continuous = true; rec.interimResults = false;
    rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { const t = $('#txt'); t.value += (t.value && !/\s$/.test(t.value) ? ' ' : '') + e.results[i][0].transcript.trim(); } };
    rec.onend = () => { rec = null; const b = $('#dictBtn'); if (b) b.textContent = '🎙 Dictar'; };
    rec.onerror = (e) => toast('Dictado: ' + (e.error === 'not-allowed' ? 'permite el micrófono en el navegador.' : e.error));
    rec.start(); btn.textContent = '⏹ Detener';
  }

  // ---------- Acciones (delegación) ----------
  const post = (id) => S.posts.find((p) => p.id === id);
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act],[data-tab]'); if (!el) return;
    if (el.dataset.tab) return go(el.dataset.tab);
    const a = el.dataset.act, id = el.dataset.id, p = id && post(id);
    try {
      if (a === 'login') return login();
      if (a === 'logout') return logout();
      if (a === 'retryload') return bootstrap();
      if (a === 'syncnow') { await doSync(); return toast(ui.sync === 'ok' ? 'Guardado en Google Sheets.' : 'No se pudo guardar.'); }
      if (a === 'legacy') return importJson(localStorage.getItem(LEGACY), 'Datos anteriores importados.');
      if (a === 'generate') return generate();
      if (a === 'dictate') return dictate();
      if (a === 'copy') return copy(p.hook + '\n\n' + p.cuerpo);
      if (a === 'publish') { p.estado = 'publicado'; p.fechaPub = today(); save(); return render(); }
      if (a === 'del') { if (confirm('¿Eliminar este post?')) { S.posts = S.posts.filter((x) => x.id !== id); save(); render(); } return; }
      if (a === 'hook') { toast('Buscando otro hook…'); const r = await AI.newHook(S, p); p.hook = r.hook; p.patronHook = r.patron_hook; save(); return render(); }
      if (a === 'answer') {
        const card = el.closest('.post'), parts = [];
        (p.pendientes || []).forEach((q) => { const inp = card.querySelector('[data-q="' + q.id + '"]'); const v = inp && inp.value.trim(); if (v) parts.push('[Respuesta a "' + q.pregunta + '"]: ' + v); });
        if (!parts.length) return toast('Escribe al menos una respuesta, o pulsa "Dejarlo así".');
        el.disabled = true;
        try { await regenerate(p, parts.join('\n')); } finally { el.disabled = false; }
        return;
      }
      if (a === 'skipq') { (p.pendientes || []).forEach((q) => { q.resuelto = true; }); save(); return render(); }
      if (a === 'fb') { const i = $(`[data-fb="${id}"]`), v = i.value.trim(); if (!v) return; S.feedback.push({ id: uid(), fecha: today(), texto: `(${p.formato}) ${v}` }); p.estado = p.estado === 'borrador' ? 'editado' : p.estado; i.value = ''; save(); return toast('Guardado. No repetiré ese error.'); }
      if (a === 'open') return go('posts', id);
      if (a === 'calview') { ui.calView = el.dataset.v; return render(); }
      if (a === 'month') { ui.monthOffset = el.dataset.d === '0' ? 0 : ui.monthOffset + +el.dataset.d; return render(); }
      if (a === 'week') { ui.weekOffset = el.dataset.d === '0' ? 0 : ui.weekOffset + +el.dataset.d; return render(); }
      if (a === 'alert') { const x = alerts()[+el.dataset.i]; if (x.focus) go('posts', x.focus); else if (x.go) go(x.go); return; }
      if (a === 'memnew') { const i = $('#memNew'), v = i.value.trim(); if (v) { S.memory.push({ id: uid(), fecha: today(), texto: v }); save(); render(); } return; }
      if (a === 'memdel') { S.memory = S.memory.filter((m) => m.id !== id); save(); return render(); }
      if (a === 'fbdel') { S.feedback = S.feedback.filter((m) => m.id !== id); save(); return render(); }
      if (a === 'abre') { const ab = S.abiertos.find((x) => x.id === id), v = $(`[data-ab="${id}"]`).value.trim(); if (!v) return; ab.resuelto = true; ab.respuesta = v; S.memory.push({ id: uid(), fecha: today(), texto: `${ab.dato}: ${v}` }); save(); return render(); }
      if (a === 'export') { const b = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }); const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = `bip-respaldo-${today()}.json`; l.click(); return; }
      if (a === 'reset') { if (confirm('Esto borra TODOS tus datos (memoria, posts y ejemplos), también en Google Sheets. ¿Seguro?')) { const n = S.profile.nombre; S = defaults(); S.profile.nombre = n; save(); await doSync(); render(); } return; }
    } catch (err) { handleErr(err); }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.act === 'filtro') { ui.filtro = t.value; return render(); }
    if (t.id === 'aud') { const f = t.files[0]; if (!f) return; setStatus('Transcribiendo audio…'); AI.transcribe(S, f).then((txt) => { const box = $('#txt'); box.value += (box.value ? '\n' : '') + txt; setStatus(''); }).catch((er) => { setStatus(''); handleErr(er); }); return; }
    if (t.id === 'imp') { const f = t.files[0]; if (!f) return; f.text().then((s) => importJson(s, 'Respaldo importado y guardado en tu cuenta.')); return; }
    const card = t.closest('.post');
    if (card && t.dataset.f) { const p = post(card.dataset.id); p[t.dataset.f] = t.value; if (['hook', 'cuerpo'].includes(t.dataset.f) && p.estado === 'borrador' && (p.hook + '\n\n' + p.cuerpo) !== p.original) p.estado = 'editado'; save(); if (['estado', 'fechaPlan', 'formato'].includes(t.dataset.f)) render(); return; }
    if (t.dataset.p) { S.profile[t.dataset.p] = t.value; return save(); }
    if (t.dataset.k) { S[t.dataset.k] = ['pilares', 'constraints'].includes(t.dataset.k) ? t.value.split('\n').map((x) => x.trim()).filter(Boolean) : t.value; return save(); }
    if (t.dataset.a) { const [i, k] = t.dataset.a.split('.'); S.audiences[+i][k] = t.value; return save(); }
    if (t.dataset.s) { S.settings[t.dataset.s] = t.value.trim(); return save(); }
    if (t.dataset.sl) { const [i, k] = t.dataset.sl.split('.'); S.settings.slots[+i][k] = k === 'dow' ? +t.value : t.value; return save(); }
  });

  function importJson(raw, okMsg) {
    try {
      const o = JSON.parse(raw), st = Object.assign({}, S.settings);
      if (o.settings && o.settings.lang) st.lang = o.settings.lang;
      if (o.settings && Array.isArray(o.settings.slots)) st.slots = o.settings.slots;
      delete o.settings; delete o.v;
      S = Object.assign(defaults(), o, { settings: st }); ensureIds(); save(); render(); toast(okMsg);
    } catch (er) { toast('Ese archivo no es un respaldo válido.'); }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.target.id === 'lgEmail' || e.target.id === 'lgCode')) login(); });
  API.onUsage = (u) => { ui.usage = u; if (session) renderHeader(); };

  // Arrastrar y soltar en el calendario
  document.addEventListener('dragstart', (e) => { const c = e.target.closest('[data-drag]'); if (c) e.dataTransfer.setData('text/plain', c.dataset.drag); });
  document.addEventListener('dragover', (e) => { if (e.target.closest('[data-drop]')) e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    const s = e.target.closest('[data-drop]'); if (!s) return; e.preventDefault();
    const p = post(e.dataTransfer.getData('text/plain')); if (!p) return; p.fechaPlan = s.dataset.drop; save(); render();
  });

  bootstrap();
})();
