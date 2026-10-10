// Simula los servicios de Google (Sheets, Propiedades, Lock, UrlFetch…) para ejecutar Code.gs en Node.
// Solo para pruebas y desarrollo local; no se despliega.
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

function createRuntime(opts = {}) {
  const props = Object.assign({ ANTHROPIC_API_KEY: 'sk-test', OPENAI_API_KEY: 'sk-oa-test' }, opts.props || {});
  const tabs = {};
  const calls = { fetch: [] };
  let aiHandler = opts.ai || (() => ({ code: 200, body: { content: [{ type: 'text', text: '{"ok":true}' }] } }));

  class Range {
    constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.cells[(this.r - 1 + i)]?.[this.c - 1 + j] ?? ''); o.push(row); } return o; }
    setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { const R = (this.sh.cells[this.r - 1 + i] = this.sh.cells[this.r - 1 + i] || []); R[this.c - 1 + j] = x; })); return this; }
    clearContent() { for (let i = 0; i < this.nr; i++) if (this.sh.cells[this.r - 1 + i]) for (let j = 0; j < this.nc; j++) this.sh.cells[this.r - 1 + i][this.c - 1 + j] = ''; this.sh.trim(); return this; }
    setNumberFormat() { return this; } setFontWeight() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.cells = []; }
    trim() { while (this.cells.length && (this.cells[this.cells.length - 1] || []).every((x) => x === '' || x == null)) this.cells.pop(); }
    getLastRow() { this.trim(); return this.cells.length; }
    getDataRange() { const n = this.getLastRow(), w = Math.max(1, ...this.cells.map((r) => (r || []).length)); return new Range(this, 1, 1, n, w); }
    getRange(r, c, nr = 1, nc = 1) { if (nr < 1) throw new Error('numRows < 1'); return new Range(this, r, c, nr, nc); }
    appendRow(row) { this.cells.push(row); }
    setFrozenRows() {}
  }
  const ss = { getSheetByName: (n) => tabs[n] || null, insertSheet: (n) => (tabs[n] = new Sheet(n)) };

  const g = {
    console, Date, JSON, Math, Number, String, Array, Object, Error, parseInt, isNaN,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getScriptTimeZone: () => 'America/Lima' },
    Utilities: {
      formatDate: (d) => { const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); },
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', k).update(v).digest()).map((b) => (b > 127 ? b - 256 : b)),
      base64EncodeWebSafe: (s) => Buffer.from(s).toString('base64url'),
      base64DecodeWebSafe: (s) => Array.from(Buffer.from(s, 'base64url')),
      base64Decode: (s) => Array.from(Buffer.from(s, 'base64')),
      newBlob: (bytes) => ({ getDataAsString: () => Buffer.from(bytes).toString('utf8') })
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ t, setMimeType() { return this; }, getContent() { return this.t; } }) },
    UrlFetchApp: {
      fetch: (url, o) => {
        calls.fetch.push({ url, o });
        const r = url.includes('openai') ? { code: 200, body: { text: 'texto transcrito' } } : aiHandler(url, o);
        return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.body) };
      }
    }
  };
  vm.createContext(g);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), g, { filename: 'Code.gs' });

  return {
    g, props, tabs, calls,
    setAi(fn) { aiHandler = fn; },
    setup() { return g.setupSheets(); },
    addUser(correo, nombre = '', activo = 'SI', limite = '', codigo = '') { tabs.Usuarios.appendRow([correo, nombre, activo, limite, codigo, '']); },
    post(body) { return JSON.parse(g.doPost({ postData: { contents: JSON.stringify(body) } }).getContent()); }
  };
}
module.exports = { createRuntime };
