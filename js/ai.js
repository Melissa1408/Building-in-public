// Arma el prompt (skill + memoria) y lo envía al backend, que guarda la clave y aplica el límite diario.
(function () {

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
  "pendientes": [máximo 2 objetos {"dato": "qué falta", "pregunta": "pregunta de una línea"}, o lista vacía],
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

# REGLAS DE ESTA APLICACIÓN (tienen prioridad sobre el skill)
- Tema y público: salen SOLO del perfil, el proyecto, la memoria y lo que la persona cuenta. Si no hay perfil, no asumas industria, tecnología ni rol. Ignora cualquier ejemplo de industria del skill.
- Preguntas: máximo 2 en "pendientes", de UNA línea, respondibles en una frase (menos de 30 segundos). Solo si sin ese dato el post no tiene sentido. Si el post se sostiene con lo que hay, devuelve "pendientes": [].
- Elige el formato que el material YA cubre; no elijas uno que exija datos que no existen. Lo que falte y no sea esencial, omítelo (no lo inventes).
- Si un dato esencial falta, redacta igual y deja "[por completar]" solo en ese punto.
- "memoria": máximo 3 hechos, solo los que dijo explícitamente, cada uno en menos de 12 palabras.

# SALIDA
${SCHEMA}`;
  }

  async function call(S, system, user, maxTokens) {
    const r = await API.call('ai', { system, user, maxTokens: maxTokens || 3000 });
    return r.text;
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

  // Audio → texto en el servidor (Whisper). El dictado en vivo usa el navegador y no gasta cupo.
  function toBase64(file) {
    return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(new Error('No se pudo leer el audio.')); r.readAsDataURL(file); });
  }
  async function transcribe(S, file) {
    if (file.size > 10 * 1024 * 1024) throw new Error('El audio pesa más de 10 MB. Usa uno más corto o el botón Dictar.');
    const r = await API.call('transcribe', { audio: await toBase64(file), mime: file.type || 'audio/webm' });
    return r.text || '';
  }

  window.AI = { generatePost, newHook, transcribe };
})();
