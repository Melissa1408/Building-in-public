# Building in Public · Dashboard

Web estática (HTML + JS, sin build ni servidor) para convertir lo que una persona aprende o decide en posts de LinkedIn de Building in Public, con calendario semanal y mensual.

**Flujo:** Hoy → dicta/escribe/sube audio → *Generar post* → revisa hook y cuerpo → *Copiar* → publica a mano en LinkedIn → *Marcar publicado*.

## Qué hace cada pestaña
- **Hoy**: captura rápida y generación. Si falta un dato esencial, muestra la pregunta exacta y regenera con la respuesta.
- **Calendario**: 3 huecos por semana (editables), arrastrar y soltar, alertas de rotación de formato y público.
- **Posts**: borrador → editado → publicado. Cada corrección que ella guarda alimenta el feedback para no repetir errores.
- **Memoria**: perfil, público, restricciones, datos abiertos, notas del "cerebro" y ajustes. Crece con cada captura.

## Cómo funciona
Página estática (GitHub Pages) + **Google Sheets como base de datos** + **Apps Script como servidor**. **Sin registro ni aprobación:** cualquiera escribe su correo, se guarda solo en la pestaña *Usuarios* y obtiene **2 pruebas gratis**. Las personas que tú agregues a mano tienen cupo diario y código de acceso opcional. La IA corre en el servidor (las claves nunca están en la página) y hay topes diarios que protegen tu gasto.

**Despliegue paso a paso: [DESPLIEGUE.md](DESPLIEGUE.md).** Variables de entorno: [.env.example](.env.example).

## Privacidad
Este repo **no contiene datos personales ni claves**. Los datos de cada usuario viven en tu Google Sheet (privado). `.env` y `private/` están en `.gitignore`.

## Datos de una persona
Perfil, reglas y ejemplos aprobados se cargan con **Memoria → Importar respaldo** (JSON). Van en `private/` (ignorado por git) y nunca se suben.

## Actualizar la skill
La fuente de verdad es `skill/`. Tras editarla: `node tools/build-knowledge.js` regenera `js/knowledge.js`.

## Estructura
`index.html` · `css/` · `js/app.js` (UI, login, sincronización) · `js/api.js` (cliente del servidor) · `js/ai.js` (prompt) · `js/config.js` (URL del servidor) · `js/knowledge.js` (generado) · `apps-script/` (servidor + pruebas) · `skill/` · `docs/` · `tools/`
