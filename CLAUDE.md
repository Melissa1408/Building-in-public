# Building in Public · Dashboard

Web estática (vanilla JS, sin build). Genera posts de LinkedIn a partir de lo que la usuaria aprende. Ver `README.md` y `docs/spec.md`.

## Reglas
- **Cero datos personales en el repo.** Perfil, transcripciones, posts y claves viven en `localStorage` del navegador. Nunca commitear respaldos (`bip-respaldo-*.json`), `.env` ni claves.
- `js/knowledge.js` es **generado** desde `skill/`. No editarlo a mano; correr `node tools/build-knowledge.js`.
- Reglas de redacción (en `skill/SKILL.md`): no inventar datos; cuerpo ~80% textual y hook ~20% reescrito; no vender el producto; sin enlaces en el cuerpo.
- Cadencia por defecto: 3 posts por semana (editable en Memoria → Ajustes).
- `private/` está en .gitignore (datos de una persona concreta): nunca commitear.
- Publicación manual (copiar y pegar). No integrar la API de LinkedIn.
- UI en español. Probar con `node tools/serve.js` (los scripts no corren desde `file://` en la vista previa).
- Nunca enviar la API key a ningún host que no sea api.anthropic.com / api.openai.com.
