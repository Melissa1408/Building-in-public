// Genera js/knowledge.js a partir de /skill (fuente de verdad). Uso: node tools/build-knowledge.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

const skillMd = read('skill/SKILL.md').replace(/^---[\s\S]*?---\n/, '');
// La tabla de público del skill es un ejemplo de una industria concreta: no se envía a la IA (sesgaría a todos los usuarios).
const formatsMd = read('skill/references/formats.md').replace(/## Tabla de público objetivo[\s\S]*?(?=## Criterios de selección rápida)/, '');
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
    { nombre: 'Colegas de tu industria', busca: 'Aprender de un caso real y ver que otros también se bloquean', evitar: 'Condescendencia; explicar lo básico' },
    { nombre: 'Personas que están aprendiendo lo mismo', busca: 'Pasos concretos y errores que pueden evitar', evitar: 'Jerga sin explicar' },
    { nombre: 'Quienes contratan o lideran equipos', busca: 'Ver criterio y cómo piensas tus decisiones', evitar: 'Solo lista de tareas; mostrar el porqué' },
    { nombre: 'Clientes o aliados potenciales', busca: 'Evidencia de que entiendes su problema', evitar: 'Vender; mostrar el proceso' }
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

// Públicos que la persona puede marcar en Memoria → Público (neutros, sin industria). Los 4 primeros son el valor inicial.
const catalogoAudiencias = [
  { nombre: 'Colegas de tu industria', busca: 'Aprender de un caso real y ver que otros también se bloquean', evitar: 'Condescendencia; explicar lo básico' },
  { nombre: 'Personas que están aprendiendo lo mismo', busca: 'Pasos concretos y errores que pueden evitar', evitar: 'Jerga sin explicar' },
  { nombre: 'Quienes contratan o lideran equipos', busca: 'Ver criterio y cómo piensas tus decisiones', evitar: 'Solo lista de tareas; mostrar el porqué' },
  { nombre: 'Clientes o aliados potenciales', busca: 'Evidencia de que entiendes su problema', evitar: 'Vender; mostrar el proceso' },
  { nombre: 'Emprendedores y fundadores', busca: 'Decisiones con números reales, trade-offs y lecciones de negocio', evitar: 'Frases motivacionales sin datos' },
  { nombre: 'Personas técnicas (desarrollo, datos, producto)', busca: 'Profundidad, detalles de cómo lo resolviste y por qué', evitar: 'Simplificar en exceso' },
  { nombre: 'Reclutadores', busca: 'Evidencia de habilidades y de cómo comunicas', evitar: 'Un CV en prosa; mostrar un proyecto vivo' },
  { nombre: 'Mentores y referentes de tu campo', busca: 'Ver tu razonamiento y tu capacidad de aprender', evitar: 'Pedir validación; mostrar qué probaste' }
];

const out = `// ARCHIVO GENERADO por tools/build-knowledge.js. No editar a mano: edita /skill y vuelve a generar.
window.KB = ${JSON.stringify({ skillMd, formatsMd, hooksMd, formatos, patrones, defaults, catalogoAudiencias }, null, 2)};
`;
fs.writeFileSync(path.join(root, 'js/knowledge.js'), out);
console.log('OK', formatos.length, 'formatos,', patrones.length, 'patrones de hook');
console.log(formatos.join(' | '));
console.log(patrones.join(' | '));
