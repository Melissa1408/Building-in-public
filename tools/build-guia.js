// Convierte docs/guia-building-in-public.md en js/guia.js (HTML para la pestaña "Guía" y la receta rápida de "Hoy").
// Uso: node tools/build-guia.js   · Fuente única: el .md (también sirve para compartir).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const md = fs.readFileSync(path.join(root, 'docs/guia-building-in-public.md'), 'utf8').replace(/\r\n/g, '\n');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');

function render(src) {
  const lines = src.split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    let m;
    if ((m = l.match(/^(#{1,3}) (.*)/))) { const n = m[1].length + 1; out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
    if (l.startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]); i--;
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]), body = rows.slice(2).map(cells);
      out.push('<table class="guia-t"><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (l.startsWith('>')) {
      const q = []; while (i < lines.length && lines[i].startsWith('>')) q.push(lines[i++].replace(/^>\s?/, '')); i--;
      out.push('<blockquote>' + q.filter(Boolean).map((x) => `<p>${inline(x)}</p>`).join('') + '</blockquote>'); continue;
    }
    if (/^\d+\. /.test(l)) { const it = []; while (i < lines.length && /^\d+\. /.test(lines[i])) it.push(lines[i++].replace(/^\d+\. /, '')); i--; out.push('<ol>' + it.map((x) => `<li>${inline(x)}</li>`).join('') + '</ol>'); continue; }
    if (/^- /.test(l)) { const it = []; while (i < lines.length && /^- /.test(lines[i])) it.push(lines[i++].replace(/^- /, '')); i--; out.push('<ul>' + it.map((x) => `<li>${inline(x)}</li>`).join('') + '</ul>'); continue; }
    out.push(`<p>${inline(l)}</p>`);
  }
  return out.join('\n');
}

// Título (H1) fuera del cuerpo; "Receta de 60 segundos" también se extrae para mostrarla en la pestaña Hoy.
const body = md.replace(/^# .*\n/, '');
const m = body.match(/## Receta de 60 segundos\n([\s\S]*?)(?=\n## )/);
const rapida = m ? render(m[1]) : '';
fs.writeFileSync(path.join(root, 'js/guia.js'),
`// ARCHIVO GENERADO por tools/build-guia.js desde docs/guia-building-in-public.md. No editar a mano.
window.GUIA = ${JSON.stringify({ html: render(body), rapida }, null, 2)};
`);
console.log('OK js/guia.js', render(body).length, 'caracteres; receta rápida:', rapida ? 'sí' : 'NO');
