// Genera js/knowledge.js a partir de /skill (fuente de verdad). Uso: node tools/build-knowledge.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

const skillMd = read('skill/SKILL.md').replace(/^---[\s\S]*?---\n/, '');
const formatsMd = read('skill/references/formats.md');
const hooksMd = read('skill/references/hooks.md');

const formatos = [...formatsMd.matchAll(/^### \d+\. (.+)$/gm)].map((m) => m[1].trim());
const patrones = [...hooksMd.matchAll(/^\| ([^|]+?) \|/gm)]
  .map((m) => m[1].trim())
  .filter((n) => n !== 'Patrón' && !/^-+$/.test(n));

// Valores iniciales genéricos (repo público). Los datos de cada persona van en un respaldo importable, nunca aquí.
const defaults = {
  profile: { nombre: '', rol: '', nivel: '', proyecto: '', etapa: '', tono: '', noEs: '' },
  brief: '',
  pilares: [],
  audiencias: [
    { nombre: 'Desarrolladores junior/intermedios', busca: 'Aprender de un caso real, ver que otros también se bloquean', evitar: 'Condescendencia; explicar lo básico' },
    { nombre: 'Desarrolladores senior / Tech Leads', busca: 'Profundidad técnica; evaluar si piensa bien', evitar: 'Simplificar en exceso; mostrar criterio' },
    { nombre: 'Founders de fintech', busca: 'Ver si entiende el negocio detrás de la tecnología', evitar: 'Solo código; mostrar visión de producto' },
    { nombre: 'Reclutadores del sector', busca: 'Evidencia de habilidades técnicas y comunicación', evitar: 'CV en prosa; mostrar proyecto vivo' }
  ],
  constraints: [
    'No inventar datos: todo número, decisión o cita debe venir de lo que ella cuenta.',
    'No vender el producto: se documenta el proceso, no se promociona.',
    'Sin enlaces en el cuerpo del post.'
  ],
  abiertos: [],
  slots: [
    { dow: 1, tipo: 'Descubrimiento' },
    { dow: 3, tipo: 'Decisión' },
    { dow: 5, tipo: 'Descubrimiento o decisión' }
  ]
};

const out = `// ARCHIVO GENERADO por tools/build-knowledge.js. No editar a mano: edita /skill y vuelve a generar.
window.KB = ${JSON.stringify({ skillMd, formatsMd, hooksMd, formatos, patrones, defaults }, null, 2)};
`;
fs.writeFileSync(path.join(root, 'js/knowledge.js'), out);
console.log('OK', formatos.length, 'formatos,', patrones.length, 'patrones de hook');
console.log(formatos.join(' | '));
console.log(patrones.join(' | '));
