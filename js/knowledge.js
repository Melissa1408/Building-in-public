// ARCHIVO GENERADO por tools/build-knowledge.js. No editar a mano: edita /skill y vuelve a generar.
window.KB = {
  "skillMd": "\n# Building in Public — Generador de posts de LinkedIn\n\nConvierte la voz cruda de un founder o desarrollador técnico (transcripciones, notas de voz, respuestas de brief) en posts de LinkedIn que documentan su proceso de construcción, siguiendo un sistema de 15 estructuras narrativas.\n\n## Antes de empezar: qué inputs necesitas\n\nNo inventes ningún dato faltante. Si algo de esto no está disponible, pídelo antes de redactar (o avanza con lo que hay y marca el resto como pendiente):\n\n1. **Perfil de la persona**: rol, nivel de experiencia, qué está construyendo, en qué etapa está, su voz/tono (directa, técnica, informal, etc.), qué NO es (para no exagerar su expertise).\n2. **Brief de mentalidad/motivación**: por qué construye esto, su tesis contraria (si tiene una), sus miedos, su visión de éxito. Normalmente viene de un cuestionario de brief respondido una sola vez al inicio del proyecto.\n3. **Público objetivo**: 2-4 segmentos con qué busca cada uno y qué evitar (ver `references/formats.md` para la tabla de referencia genérica; ajústala a cada cliente).\n4. **Restricciones de contenido**: reglas explícitas que la persona o su gestor de marca haya dado (ej. no inventar datos, no vender el producto, no usar enlaces en el cuerpo, no mencionar X por Y razón). Estas restricciones son específicas de cada cliente — pregúntalas si no las tienes.\n5. **\"Documentación #\"**: la transcripción concreta de esta ronda, normalmente ya organizada por el gestor de marca en preguntas que corresponden a 1-3 formatos.\n\nSi trabajas con un cliente nuevo (otra persona distinta a la actual), repite este descubrimiento — el sistema es genérico, pero cada persona tiene su propio perfil, público y restricciones.\n\n## Flujo de trabajo\n\n### Paso 1 — Clasificar el problema\nLee la Documentación y decide qué problema/obstáculo real está describiendo la persona. No fuerces las respuestas a encajar en categorías predefinidas: analiza primero de qué habla más, qué le genera fricción o le da orgullo, y nombra el problema en una frase.\n\n### Paso 2 — Elegir el formato\nVer `references/formats.md` para las 15 estructuras completas. Criterios rápidos de selección:\n- Error específico y costoso → **Honest Miss**\n- Decisión difícil con trade-offs → **Honest Tradeoff**\n- Proceso o sistema que ya funciona → **Process Reveal** / **Behind-The-Scenes Build**\n- Patrón observado en otros → **Pattern Observation**\n- Opinión fuerte o creencia que desafía el consenso → **Contrarian Take** / **Hot Take**\n- Avance medible de la semana → **Weekly Update** / **Metric Story**\n- Tesis abierta a debate → **Strong Opinion Loosely Held**\n\nNo te ates a un formato si el material no calza del todo — es preferible adaptar la estructura a lo que la persona realmente compartió que forzar el molde.\n\n### Paso 3 — Verificar completitud\nCada formato tiene una lista de \"material needed\" (ver referencia). Si falta un elemento esencial:\n- No lo inventes.\n- Señálalo explícitamente como pendiente y qué pregunta haría falta hacerle a la persona.\n- Aun así, redacta el post con lo que sí tienes si es suficiente para sostenerse solo.\n\n### Paso 4 — Redactar\nReglas de redacción, en orden de importancia:\n1. **No inventar datos.** Todo número, decisión o cita debe venir de la transcripción.\n2. **Sonar a la persona, no a plantilla.** Sigue la estructura del formato pero varía las transiciones — evita que cada post empiece con la misma fórmula (\"El contexto:\", \"El fallo es:\"). Usa el tono de voz que se definió en el perfil (directo, coloquial, con muletillas naturales del cliente si las usa).\n3. **Explicar jerga técnica** de forma accesible sin sobre-simplificar — el público incluye tanto devs junior como senior.\n4. **No vender el producto.** El post documenta el proceso, no promociona el bot/app/sistema.\n5. **Sin enlaces en el cuerpo del post** (a menos que el cliente indique lo contrario).\n6. Aplica cualquier restricción específica del cliente que hayas registrado (ej. no mencionar cierto dato porque cambia cómo lo lee un reclutador).\n\n### Paso 4.5 — Separar el hook del cuerpo\nEl cuerpo del post se mantiene ~80% igual a la narración original de la persona (orden, palabras, ritmo) — solo limpieza mínima de muletillas. El hook (primera línea o dos) es el único ~20% que se reescribe, y se hace *después* de redactar el cuerpo:\n\n1. Redacta el cuerpo casi textual.\n2. Encuentra el punto de mayor tensión o sorpresa dentro de ese cuerpo (el error, la pregunta sin resolver, el \"y ahí me di cuenta de...\").\n3. Convierte ese punto en el hook usando uno de los patrones de `references/hooks.md`.\n4. El resto del cuerpo queda intacto — el hook es la puerta de entrada, no un resumen del post.\n\nNo elijas el patrón de hook por el formato narrativo usado (Honest Miss, Contrarian Take, etc.) sino por dónde cae la carga emocional dentro de la historia — dos posts del mismo formato pueden necesitar hooks distintos.\n\n### Paso 5 — Entregar\nDevuelve siempre, por cada post:\n1. Formato elegido (nombre)\n2. Por qué ese formato (2 frases)\n3. Problema que presenta el post\n4. Intención / público principal al que apunta\n5. Post completo\n\n## Mantener la secuencia entre publicaciones\n\nEste sistema se usa en rondas sucesivas de \"Documentación #\". Para mantener coherencia y evitar repetir el mismo formato o problema dos veces seguidas, antes de generar una nueva ronda intenta reunir (pregúntale al usuario si no las tiene a mano):\n\n- **Qué posts ya se publicaron**: formato usado, problema cubierto, público al que apuntó cada uno — para variar y no saturar de \"Honest Miss\" o de un solo público objetivo.\n- **Número de semana o de post en la serie**, si algún formato lo requiere (ej. \"Semana 3 de construir X\" en Weekly Update).\n- **Cualquier feedback de edición** que el usuario haya dado sobre posts anteriores (frases a evitar, tono a ajustar), para no repetir el mismo ajuste cada ronda.\n- **Datos pendientes de confirmar con la persona** (stack técnico exacto, nombres de herramientas/brokers, cifras) que quedaron abiertos en rondas anteriores.\n- **Reacciones o comentarios reales** que haya recibido un post ya publicado, si el usuario los comparte — son material válido para un futuro Customer Conversation o Pattern Observation.\n\nSi el usuario no lleva este registro, ofrécete a mantenerlo tú (en un archivo o tabla simple) para no perder la secuencia de formatos/problemas/público entre sesiones.\n",
  "formatsMd": "# Las 15 estructuras de post — Building in Public\n\n## Grupo A: Formatos base\n\n### 1. Weekly Update\nEstructura: Semana X de [proyecto] → 3-4 bullets de lo que pasó → el número honesto (aunque sea 0) → por qué compartes esto → pregunta final.\nÚsalo cuando: hay datos concretos de la semana y quieres mostrar progreso real.\nRegla clave: el número honesto siempre va, aunque sea 0 — especialmente si es 0.\n\n### 2. Honest Miss (Error Caro)\nEstructura: confesión del error en una frase → contexto (qué pasó, por qué era razonable) → qué te hizo cambiar de opinión → qué crees ahora → qué haces diferente → costo (tiempo/dinero) de la lección → pregunta final.\nÚsalo cuando: cometiste un error específico y medible.\nRegla clave: el error debe ser específico (tiempo, números, consecuencia), no genérico.\n\n### 3. Hot Take (Opinión Contraria)\nEstructura: hot take en una frase → por qué el consenso está mal → qué haces tú en su lugar → reafirmación provocadora → \"¿estoy equivocado?\".\nÚsalo cuando: quieres generar debate con una opinión amplia.\n\n## Grupo B: Los 12 formatos del archivo\n\n### 4. Contrarian Take\nEstructura: \"Todos dicen X. Yo digo Y.\" → fallo concreto del consenso → qué haces en su lugar con ejemplo → a quién vas a molestar → reafirmación.\nDiferencia con Hot Take: más específico, nombra la creencia exacta que desafía.\nMaterial needed: creencia popular (X), postura contraria (Y), fallo específico del consenso, qué haces en su lugar (con ejemplo), a quién molesta, frase de reafirmación.\n\n### 5. Honest Tradeoff\nEstructura: \"Elegí X sobre Y. Esto me costó.\" → contexto breve → 2-3 bullets de lo ganado → 2-3 bullets de lo perdido → veredicto con un \"pero\" (nunca sí/no simple).\nMaterial needed: la decisión (X vs Y), contexto breve, 2-3 ganancias, 2-3 pérdidas, si lo haría de nuevo y por qué.\n\n### 6. Behind-The-Scenes Build\nEstructura: \"Así construí X en [tiempo].\" → problema que no funcionaba → restricciones (presupuesto, tiempo, equipo, conocimiento) → 3-5 decisiones clave → resultado en números + sorpresa.\nMaterial needed: qué construiste y en cuánto tiempo, problema previo, restricciones, 3-5 decisiones clave, resultado numérico, la sorpresa.\n\n### 7. Pattern Observation\nEstructura: \"He analizado N [casos] en [tiempo]. Este es el patrón.\" → el patrón en una frase → 3-5 manifestaciones concretas anonimizadas → tu teoría de por qué pasa → qué significa para tu audiencia.\nRegla clave: no necesitas ser experto, solo haber observado más que los demás.\n\n### 8. Customer Conversation (adaptado)\nEstructura: una cita o conversación en una línea → contexto de quién y por qué importa → 2-3 párrafos de insight → qué vas a hacer al respecto → cierre invitando a compartir.\nAdaptación sin clientes: usa conversaciones contigo mismo, con un mentor, o con IA.\n\n### 9. Metric Story\nEstructura: métrica plana (\"Mi métrica es X\") → qué significa realmente (no el brag) → 2-3 drivers clave → qué intentaste y no funcionó → en qué te enfocas ahora.\nRegla clave: no es un brag, es una historia — el número es el punto de partida, no el final.\n\n### 10. Honest Miss (creencia)\nEstructura: \"Hace X meses dije [afirmación]. Me equivoqué.\" → qué creías y por qué era razonable → qué te hizo cambiar de opinión (concreto) → qué crees ahora → qué haces diferente.\nDiferencia con Honest Miss (#2): este es sobre un error de creencia, no de acción.\n\n### 11. Hot Take Roundup\nEstructura: \"N opiniones impopulares sobre [espacio]\" → lista numerada (1-2 frases cada una) → \"¿con cuál discrepas más?\".\n\n### 12. Process Reveal\nEstructura: \"Este es el proceso que uso para [resultado]\" → trigger (cuándo se activa) → 4-7 pasos (una frase c/u) → qué dejaste de hacer para que funcione → resultado en un periodo específico.\nRegla clave: el paso \"qué dejaste de hacer\" es el más valioso — muestra el trade-off.\n\n### 13. What I Believed Then vs Now\nEstructura: mínimo 4 pares \"Then: [creencia antigua] / Now: [creencia actual]\" → lección meta sobre cómo evolucionó tu pensamiento.\n\n### 14. Strong Opinion Loosely Held\nEstructura: \"Teoría de trabajo: [tesis]\" → por qué lo crees ahora → evidencia a favor → evidencia en contra (obligatoria) → \"¿qué me falta?\".\nRegla clave: sin evidencia en contra no es \"loosely held\", es imposición.\n\n### 15. Quote-Bait Open Loop\nEstructura: frase corta y evocadora → una frase de contexto → \"estoy escribiendo algo más largo, tres preguntas que quiero afinar\" → 3 preguntas genuinas → \"deja tu take, citaré las mejores\".\n\n---\n\n## Criterios de selección rápida\n\n- Material describe un error específico → Honest Miss / Error Caro\n- Material describe una decisión difícil → Honest Tradeoff\n- Material describe un proceso que funciona → Process Reveal / Behind-The-Scenes\n- Material describe un patrón observado → Pattern Observation\n- Material describe una opinión fuerte → Contrarian Take / Hot Take\n- Material describe una evolución de pensamiento → Then vs Now\n- Material describe una métrica → Metric Story\n- Material describe una conversación reveladora → Customer Conversation\n- Material describe progreso semanal → Weekly Update\n- Material es una tesis abierta a debate → Strong Opinion Loosely Held\n- Material son múltiples opiniones → Hot Take Roundup\n- Se necesita engagement rápido → Quote-Bait Open Loop\n",
  "hooksMd": "# Banco de patrones de hook\n\nEl hook es ~20% del post: la apertura, reescrita para generar interés. El cuerpo (~80% restante) se mantiene casi textual a la narración original de la persona — ver Paso 4.5 del SKILL.md.\n\n| Patrón | Cuándo usarlo | Ejemplo |\n|---|---|---|\n| Pregunta especular | El cuerpo describe un error o una decisión — invita al lector a ponerse en el lugar de la persona antes de contar qué pasó | \"¿Qué harías si te das cuenta de un error justo cuando el cliente te lo señala?\" |\n| Normalización | El error o la creencia es algo común — genera identificación inmediata | \"No es raro pensar así: revisé todo, usé la plantilla de siempre, y aun así...\" |\n| Confesión de creencia pasada | Formato Honest Miss (de creencia) o Then vs Now | \"Yo también creía que revisar dos veces era suficiente.\" |\n| Advertencia / fricción | Post de opinión incómoda — Contrarian Take, Hot Take | \"Puede que te moleste escuchar esto, pero tu checklist no te está salvando de nada.\" |\n| Revelación post-error | Error caro o lección aprendida a la fuerza | \"A las malas me di cuenta de que 'revisado' no significa 'a prueba de errores'.\" |\n| Contraste antes/después | Cambio de comportamiento o creencia como resultado directo de un evento | \"No sabía cuánto podía costar un 'parecía correcto' hasta que me costó medio día rehaciendo un cierre.\" |\n\n## Cómo elegir el patrón\n\nNo se elige por el formato narrativo (Honest Miss, Contrarian Take, etc.) — se elige por dónde cae la carga emocional o de sorpresa dentro del cuerpo ya redactado. Dos posts del mismo formato pueden necesitar patrones de hook distintos si el momento más fuerte de la historia cae en lugares diferentes (uno en el error mismo, otro en la decisión que tomó después).\n\n## Proceso\n\n1. Redacta el cuerpo casi textual a lo que la persona contó.\n2. Localiza el punto de mayor tensión/sorpresa en ese cuerpo.\n3. Convierte ese punto en el hook con el patrón que mejor calce.\n4. No toques el resto del cuerpo — el hook es la puerta de entrada, no un resumen.\n",
  "formatos": [
    "Weekly Update",
    "Honest Miss (Error Caro)",
    "Hot Take (Opinión Contraria)",
    "Contrarian Take",
    "Honest Tradeoff",
    "Behind-The-Scenes Build",
    "Pattern Observation",
    "Customer Conversation (adaptado)",
    "Metric Story",
    "Honest Miss (creencia)",
    "Hot Take Roundup",
    "Process Reveal",
    "What I Believed Then vs Now",
    "Strong Opinion Loosely Held",
    "Quote-Bait Open Loop"
  ],
  "patrones": [
    "Pregunta especular",
    "Normalización",
    "Confesión de creencia pasada",
    "Advertencia / fricción",
    "Revelación post-error",
    "Contraste antes/después"
  ],
  "defaults": {
    "profile": {
      "nombre": "",
      "rol": "",
      "nivel": "",
      "proyecto": "",
      "etapa": "",
      "tono": "",
      "noEs": ""
    },
    "brief": "",
    "pilares": [],
    "audiencias": [
      {
        "nombre": "Colegas de tu industria",
        "busca": "Aprender de un caso real y ver que otros también se bloquean",
        "evitar": "Condescendencia; explicar lo básico"
      },
      {
        "nombre": "Personas que están aprendiendo lo mismo",
        "busca": "Pasos concretos y errores que pueden evitar",
        "evitar": "Jerga sin explicar"
      },
      {
        "nombre": "Quienes contratan o lideran equipos",
        "busca": "Ver criterio y cómo piensas tus decisiones",
        "evitar": "Solo lista de tareas; mostrar el porqué"
      },
      {
        "nombre": "Clientes o aliados potenciales",
        "busca": "Evidencia de que entiendes su problema",
        "evitar": "Vender; mostrar el proceso"
      }
    ],
    "constraints": [
      "No inventar datos: todo número, decisión o cita debe venir de lo que ella cuenta.",
      "No vender el producto: se documenta el proceso, no se promociona.",
      "Sin enlaces en el cuerpo del post."
    ],
    "abiertos": [],
    "slots": [
      {
        "dow": 1,
        "tipo": "Descubrimiento"
      },
      {
        "dow": 3,
        "tipo": "Decisión"
      },
      {
        "dow": 5,
        "tipo": "Descubrimiento o decisión"
      }
    ]
  },
  "catalogoAudiencias": [
    {
      "nombre": "Colegas de tu industria",
      "busca": "Aprender de un caso real y ver que otros también se bloquean",
      "evitar": "Condescendencia; explicar lo básico"
    },
    {
      "nombre": "Personas que están aprendiendo lo mismo",
      "busca": "Pasos concretos y errores que pueden evitar",
      "evitar": "Jerga sin explicar"
    },
    {
      "nombre": "Quienes contratan o lideran equipos",
      "busca": "Ver criterio y cómo piensas tus decisiones",
      "evitar": "Solo lista de tareas; mostrar el porqué"
    },
    {
      "nombre": "Clientes o aliados potenciales",
      "busca": "Evidencia de que entiendes su problema",
      "evitar": "Vender; mostrar el proceso"
    },
    {
      "nombre": "Emprendedores y fundadores",
      "busca": "Decisiones con números reales, trade-offs y lecciones de negocio",
      "evitar": "Frases motivacionales sin datos"
    },
    {
      "nombre": "Personas técnicas (desarrollo, datos, producto)",
      "busca": "Profundidad, detalles de cómo lo resolviste y por qué",
      "evitar": "Simplificar en exceso"
    },
    {
      "nombre": "Reclutadores",
      "busca": "Evidencia de habilidades y de cómo comunicas",
      "evitar": "Un CV en prosa; mostrar un proyecto vivo"
    },
    {
      "nombre": "Mentores y referentes de tu campo",
      "busca": "Ver tu razonamiento y tu capacidad de aprender",
      "evitar": "Pedir validación; mostrar qué probaste"
    }
  ]
};
