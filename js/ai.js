// Llamadas a Claude (directo desde el navegador con la clave de la usuaria) y transcripción opcional.
(function () {
  const API = 'https://api.anthropic.com/v1/messages';

  const SCHEMA = `Responde SOLO con un objeto JSON válido (sin texto antes ni después, sin bloque de código) con esta forma exacta:
{
  "formato": "nombre exacto de uno de los 15 formatos",
  "porque": "2 frases: por qué ese formato",
  "problema": "el problema que presenta el post, en una frase",
  "publico": "público principal al que apunta (uno de los segmentos definidos)",
  "tipo": "Descubrimiento | Decisión | Estado",
  "patron_hook": "nombre exacto de un patrón del banco de hooks",
  "hook": "primera línea o dos, reescritas a partir del punto de mayor tensión del cuerpo",
  "cuerpo": "cuerpo del post, ~80% textual a su narración, solo limpieza mínima de muletillas, SIN el hook",
  "completo": true o false (false si falta material esencial del formato),
  "pendientes": [{"dato": "qué falta", "pregunta": "la pregunta exacta que hay que hacerle a ella"}],
  "memoria": ["hechos nuevos y verificables que ella contó (tecnología, decisiones, stack, números) o rasgos de su voz, uno por ítem, cortos"]
}`;

  function list(arr) { return arr.length ? arr.map((x) => '- ' + x).join('\n') : '(sin datos todavía)'; }

  function buildSystem(S) {
    const p = S.profile;
    const aud = S.audiences.map((a) => `- ${a.nombre}: busca → ${a.busca}. Evitar → ${a.evitar}.`).join('\n');
    const captures = S.captures.slice(-8).map((c) => `[${c.fecha}] ${c.texto.slice(0, 1200)}`).join('\n---\n');
    const mem = S.memory.slice(-60).map((m) => m.texto);
    const fb = S.feedback.slice(-15).map((f) => f.texto);
    const seq = S.posts.slice(-12).map((x) => `${x.fechaPlan || x.created.slice(0, 10)} · ${x.formato} · público: ${x.publico} · problema: ${x.problema} · ${x.estado}`);
    const open = S.abiertos.filter((a) => !a.resuelto).map((a) => a.dato + ': ' + a.pregunta);

    return `Eres el generador de posts de LinkedIn de "Building in Public" para ${p.nombre || 'la persona'}. Escribes en español, con su voz, nunca con voz de plantilla.

# INSTRUCCIONES DEL SISTEMA (skill)
${KB.skillMd}

# LAS 15 ESTRUCTURAS
${KB.formatsMd}

# BANCO DE HOOKS
${KB.hooksMd}

# PERFIL
Nombre: ${p.nombre}
Rol: ${p.rol || '(pendiente)'}
Nivel: ${p.nivel || '(pendiente)'}
Proyecto: ${p.proyecto || '(pendiente)'}
Etapa: ${p.etapa || '(pendiente)'}
Tono / voz: ${p.tono || '(pendiente)'}
Qué NO es: ${p.noEs || '(pendiente)'}
Pilares de contenido: ${S.pilares.join(' · ')}
Brief de mentalidad: ${S.brief || '(pendiente)'}

# PÚBLICO
${aud}

# RESTRICCIONES (obligatorias)
${list(S.constraints)}

# MEMORIA ACUMULADA (lo que ya sabes de ella y su proyecto)
${list(mem)}

# EJEMPLOS APROBADOS (referencia de calidad y de voz: imita el nivel, el ritmo y la honestidad; NO copies su contenido)
${S.ejemplos || '(todavía no hay)'}

# CÓMO HABLA (transcripciones recientes, úsalas para imitar su voz, no para copiar contenido)
${captures || '(todavía no hay)'}

# FEEDBACK DE EDICIÓN (correcciones previas de ella: no repitas estos errores)
${list(fb)}

# SECUENCIA RECIENTE (no repitas el mismo formato ni el mismo público dos veces seguidas)
${list(seq)}

# DATOS ABIERTOS CON ELLA
${list(open)}

# CADENCIA
3 posts por semana. Tema: descubrimientos en tecnología y decisiones al desarrollar un proyecto fintech.

# SALIDA
${SCHEMA}`;
  }

  async function call(S, system, user, maxTokens) {
    if (!S.settings.apiKey) throw new Error('Falta tu API key de Anthropic (pestaña Memoria → Ajustes).');
    let res;
    try {
      res = await fetch(API, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': S.settings.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: S.settings.model, max_tokens: maxTokens || 3000, system, messages: [{ role: 'user', content: user }] })
      });
    } catch (e) {
      throw new Error('No se pudo conectar con la API (¿sin internet?).');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.error && data.error.message) || 'Error de la API (' + res.status + ')');
    return (data.content || []).map((b) => b.text || '').join('');
  }

  function parseJson(text) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('La respuesta no vino en el formato esperado. Intenta de nuevo.');
    try { return JSON.parse(text.slice(a, b + 1)); }
    catch (e) { throw new Error('La respuesta no se pudo leer. Intenta de nuevo.'); }
  }

  async function generatePost(S, texto, tipo) {
    const user = `Documentación (transcripción cruda de lo que ella aprendió o decidió):\n"""\n${texto}\n"""\n\nTipo de slot pedido: ${tipo || 'el que mejor calce'}.\nGenera el post siguiendo el flujo del skill.`;
    return parseJson(await call(S, buildSystem(S), user, 3500));
  }

  async function newHook(S, post) {
    const user = `Este es el cuerpo de un post ya redactado (no lo cambies):\n"""\n${post.cuerpo}\n"""\nHook actual (${post.patronHook}): "${post.hook}"\nEscribe UN hook distinto usando un patrón del banco DIFERENTE al actual, según dónde cae la tensión en el cuerpo. Responde SOLO JSON: {"patron_hook": "...", "hook": "..."}`;
    return parseJson(await call(S, buildSystem(S), user, 600));
  }

  // Audio → texto con Whisper (opcional, requiere clave de OpenAI). El dictado en vivo usa SpeechRecognition del navegador.
  async function transcribe(S, file) {
    if (!S.settings.openaiKey) throw new Error('Para subir audio necesitas una clave de OpenAI (Memoria → Ajustes). El botón Dictar no la necesita.');
    const fd = new FormData();
    fd.append('file', file); fd.append('model', 'whisper-1'); fd.append('language', 'es');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + S.settings.openaiKey }, body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.error && data.error.message) || 'Error de transcripción (' + res.status + ')');
    return data.text || '';
  }

  window.AI = { generatePost, newHook, transcribe };
})();
