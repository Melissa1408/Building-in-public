# Building in Public · Dashboard

Web estática (HTML + JS, sin build ni servidor) para convertir lo que una persona aprende o decide en posts de LinkedIn de Building in Public, con calendario semanal y mensual.

**Flujo:** Hoy → dicta/escribe/sube audio → *Generar post* → revisa hook y cuerpo → *Copiar* → publica a mano en LinkedIn → *Marcar publicado*.

## Qué hace cada pestaña
- **Hoy**: captura rápida y generación. Si falta un dato esencial, muestra la pregunta exacta y regenera con la respuesta.
- **Calendario**: 3 huecos por semana (editables), arrastrar y soltar, alertas de rotación de formato y público.
- **Posts**: borrador → editado → publicado. Cada corrección que ella guarda alimenta el feedback para no repetir errores.
- **Memoria**: perfil, público, restricciones, datos abiertos, notas del "cerebro" y ajustes. Crece con cada captura.

## Privacidad (importante)
Este repo **no contiene datos personales**: todo (perfil, transcripciones, posts, claves) vive en el `localStorage` de su navegador. Para no perderlo: **Memoria → Exportar respaldo**. El respaldo es un JSON que **no debe subirse a git** (ya está ignorado).

## Uso
1. Abrir la URL de GitHub Pages (o `node tools/serve.js` → http://localhost:5173).
2. Memoria → Ajustes → pegar su **API key de Anthropic** (se guarda solo en su navegador).
3. Completar Perfil y Brief en Memoria (mientras más completo, mejor suena).
4. Dictado en vivo: Chrome o Edge. Subir audio: requiere clave de OpenAI (opcional).

## Datos de una persona
Perfil, reglas y ejemplos aprobados se cargan con **Memoria → Importar respaldo** (JSON). Van en `private/` (ignorado por git) y nunca se suben.

## Publicar en GitHub Pages (opcional)
Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.

## Actualizar la skill
La fuente de verdad es `skill/`. Tras editarla: `node tools/build-knowledge.js` regenera `js/knowledge.js`.

## Estructura
`index.html` · `css/` · `js/app.js` (UI y estado) · `js/ai.js` (prompt y llamadas) · `js/knowledge.js` (generado) · `skill/` · `docs/` · `tools/`
