# Building in Public · Dashboard

Web estática (vanilla JS, sin build) + backend en Google Apps Script (`apps-script/Code.gs`) con Google Sheets como base de datos. Genera posts de LinkedIn a partir de lo que la usuaria aprende. Ver `README.md` y `docs/spec.md`.

## Reglas
- **Cero datos personales ni claves en el repo.** Los datos viven en el Google Sheet (pestañas Usuarios/Uso/Datos); las claves de IA, en Propiedades del script. Nunca commitear `.env`, `apps-script/Setup.local.gs`, respaldos ni `private/`.
- Login por correo con **auto-registro**: un correo nuevo se crea solo como usuario de prueba (`origen = prueba`, `TRIAL_LIMIT` = 2 usos en total, sin audio). Usuarios manuales: cupo diario y código opcional. Todos los límites viven en el servidor; no moverlos al cliente.
- Prompt y valores por defecto deben ser neutros (sin industria ni rol asumidos); lo específico de una persona va en su perfil/memoria. Preguntas de seguimiento: máximo 2, de una línea.
- Tras tocar `apps-script/Code.gs`: correr `node apps-script/test/test.js` y publicar nueva versión de la Web App (ver DESPLIEGUE.md).
- `js/guia.js` es **generado** desde `docs/guia-building-in-public.md` (`node tools/build-guia.js`). Edita el .md, no el .js.
- `js/knowledge.js` es **generado** desde `skill/`. No editarlo a mano; correr `node tools/build-knowledge.js`.
- Reglas de redacción (en `skill/SKILL.md`): no inventar datos; cuerpo ~80% textual y hook ~20% reescrito; no vender el producto; sin enlaces en el cuerpo.
- Cadencia por defecto: 3 posts por semana (editable en Memoria → Ajustes).
- `private/` está en .gitignore (datos de una persona concreta): nunca commitear.
- Publicación manual (copiar y pegar). No integrar la API de LinkedIn.
- UI en español. Probar con `node tools/serve.js` (los scripts no corren desde `file://` en la vista previa).
- La página nunca maneja claves de IA; solo habla con la URL de la Web App (`js/config.js`).
