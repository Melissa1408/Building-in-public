// Lee .env y genera:
//   1) apps-script/Setup.local.gs → función configurar() que carga las variables en "Propiedades del script" (ignorado por git).
//   2) js/config.js con APPS_SCRIPT_URL, si lo pusiste en .env.
// Uso: node tools/gen-setup.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) { console.error('Falta el archivo .env. Copia .env.example como .env y complétalo.'); process.exit(1); }

const env = {};
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !l.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const SERVER = ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'OPENAI_API_KEY', 'DAILY_AI_LIMIT', 'DAILY_TRANSCRIBE_LIMIT', 'GLOBAL_DAILY_AI_LIMIT', 'AUTO_REGISTER', 'TRIAL_LIMIT', 'TRIAL_GLOBAL_DAILY_LIMIT', 'TRIAL_NEW_USERS_DAILY_LIMIT', 'SHEET_ID', 'TOKEN_SECRET'];
if (!env.ANTHROPIC_API_KEY || /REEMPLAZA/.test(env.ANTHROPIC_API_KEY)) { console.error('ANTHROPIC_API_KEY está vacía en .env.'); process.exit(1); }
if (env.AUTO_REGISTER && !/^(SI|NO)$/i.test(env.AUTO_REGISTER)) { console.error('AUTO_REGISTER debe ser SI o NO.'); process.exit(1); }
for (const k of ['DAILY_AI_LIMIT', 'DAILY_TRANSCRIBE_LIMIT', 'GLOBAL_DAILY_AI_LIMIT', 'TRIAL_LIMIT', 'TRIAL_GLOBAL_DAILY_LIMIT', 'TRIAL_NEW_USERS_DAILY_LIMIT']) {
  if (env[k] && !/^\d+$/.test(env[k])) { console.error(k + ' debe ser un número entero.'); process.exit(1); }
}
const props = {}; SERVER.forEach((k) => { if (env[k]) props[k] = env[k]; });

fs.writeFileSync(path.join(root, 'apps-script/Setup.local.gs'),
`// GENERADO por tools/gen-setup.js. Contiene claves: NO lo subas a git. Pégalo en Apps Script, ejecuta configurar() una vez y bórralo.
function configurar() {
  PropertiesService.getScriptProperties().setProperties(${JSON.stringify(props, null, 2)}, false);
  return 'OK: ' + Object.keys(PropertiesService.getScriptProperties().getProperties()).join(', ');
}
`);
console.log('✔ apps-script/Setup.local.gs (' + Object.keys(props).join(', ') + ')');

if (env.APPS_SCRIPT_URL) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(env.APPS_SCRIPT_URL)) { console.error('APPS_SCRIPT_URL no parece una URL /exec válida.'); process.exit(1); }
  const contactUrl = env.CONTACT_URL || '';
  if (contactUrl && !/^https:\/\//.test(contactUrl)) { console.error('CONTACT_URL debe empezar con https://'); process.exit(1); }
  fs.writeFileSync(path.join(root, 'js/config.js'),
`// URL de tu Web App de Apps Script (termina en /exec). NO es un secreto. Ver DESPLIEGUE.md, paso 7.
window.BIP_CONFIG = {
  API_URL: ${JSON.stringify(env.APPS_SCRIPT_URL)},
  // Mensaje cuando se acaban las pruebas (opcional). CONTACT_URL debe empezar con https://
  CONTACT_TEXT: ${JSON.stringify(env.CONTACT_TEXT || '')},
  CONTACT_URL: ${JSON.stringify(contactUrl)}
};
`);
  console.log('✔ js/config.js actualizado con tu URL');
}
