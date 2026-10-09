---
name: building-in-public-linkedin
description: Convierte transcripciones, notas de voz o "Documentación" de un founder/desarrollador técnico en posts de LinkedIn de Building in Public. Úsala cuando el usuario pida transformar respuestas de un brief o transcripciones de voz en posts, cuando mencione formatos como Honest Miss, Contrarian Take, Process Reveal, Behind-The-Scenes, Honest Tradeoff, Pattern Observation, Metric Story o Strong Opinion, o cuando hable de documentar en LinkedIn el proceso de construir un producto técnico (bot, app, sistema) para atraer reclutadores o construir marca personal. También úsala para mantener la secuencia y el registro de publicaciones de este sistema entre sesiones.
---

# Building in Public — Generador de posts de LinkedIn

Convierte la voz cruda de un founder o desarrollador técnico (transcripciones, notas de voz, respuestas de brief) en posts de LinkedIn que documentan su proceso de construcción, siguiendo un sistema de 15 estructuras narrativas.

## Antes de empezar: qué inputs necesitas

No inventes ningún dato faltante. Si algo de esto no está disponible, pídelo antes de redactar (o avanza con lo que hay y marca el resto como pendiente):

1. **Perfil de la persona**: rol, nivel de experiencia, qué está construyendo, en qué etapa está, su voz/tono (directa, técnica, informal, etc.), qué NO es (para no exagerar su expertise).
2. **Brief de mentalidad/motivación**: por qué construye esto, su tesis contraria (si tiene una), sus miedos, su visión de éxito. Normalmente viene de un cuestionario de brief respondido una sola vez al inicio del proyecto.
3. **Público objetivo**: 2-4 segmentos con qué busca cada uno y qué evitar (ver `references/formats.md` para la tabla de referencia genérica; ajústala a cada cliente).
4. **Restricciones de contenido**: reglas explícitas que la persona o su gestor de marca haya dado (ej. no inventar datos, no vender el producto, no usar enlaces en el cuerpo, no mencionar X por Y razón). Estas restricciones son específicas de cada cliente — pregúntalas si no las tienes.
5. **"Documentación #"**: la transcripción concreta de esta ronda, normalmente ya organizada por el gestor de marca en preguntas que corresponden a 1-3 formatos.

Si trabajas con un cliente nuevo (otra persona distinta a la actual), repite este descubrimiento — el sistema es genérico, pero cada persona tiene su propio perfil, público y restricciones.

## Flujo de trabajo

### Paso 1 — Clasificar el problema
Lee la Documentación y decide qué problema/obstáculo real está describiendo la persona. No fuerces las respuestas a encajar en categorías predefinidas: analiza primero de qué habla más, qué le genera fricción o le da orgullo, y nombra el problema en una frase.

### Paso 2 — Elegir el formato
Ver `references/formats.md` para las 15 estructuras completas. Criterios rápidos de selección:
- Error específico y costoso → **Honest Miss**
- Decisión difícil con trade-offs → **Honest Tradeoff**
- Proceso o sistema que ya funciona → **Process Reveal** / **Behind-The-Scenes Build**
- Patrón observado en otros → **Pattern Observation**
- Opinión fuerte o creencia que desafía el consenso → **Contrarian Take** / **Hot Take**
- Avance medible de la semana → **Weekly Update** / **Metric Story**
- Tesis abierta a debate → **Strong Opinion Loosely Held**

No te ates a un formato si el material no calza del todo — es preferible adaptar la estructura a lo que la persona realmente compartió que forzar el molde.

### Paso 3 — Verificar completitud
Cada formato tiene una lista de "material needed" (ver referencia). Si falta un elemento esencial:
- No lo inventes.
- Señálalo explícitamente como pendiente y qué pregunta haría falta hacerle a la persona.
- Aun así, redacta el post con lo que sí tienes si es suficiente para sostenerse solo.

### Paso 4 — Redactar
Reglas de redacción, en orden de importancia:
1. **No inventar datos.** Todo número, decisión o cita debe venir de la transcripción.
2. **Sonar a la persona, no a plantilla.** Sigue la estructura del formato pero varía las transiciones — evita que cada post empiece con la misma fórmula ("El contexto:", "El fallo es:"). Usa el tono de voz que se definió en el perfil (directo, coloquial, con muletillas naturales del cliente si las usa).
3. **Explicar jerga técnica** de forma accesible sin sobre-simplificar — el público incluye tanto devs junior como senior.
4. **No vender el producto.** El post documenta el proceso, no promociona el bot/app/sistema.
5. **Sin enlaces en el cuerpo del post** (a menos que el cliente indique lo contrario).
6. Aplica cualquier restricción específica del cliente que hayas registrado (ej. no mencionar cierto dato porque cambia cómo lo lee un reclutador).

### Paso 4.5 — Separar el hook del cuerpo
El cuerpo del post se mantiene ~80% igual a la narración original de la persona (orden, palabras, ritmo) — solo limpieza mínima de muletillas. El hook (primera línea o dos) es el único ~20% que se reescribe, y se hace *después* de redactar el cuerpo:

1. Redacta el cuerpo casi textual.
2. Encuentra el punto de mayor tensión o sorpresa dentro de ese cuerpo (el error, la pregunta sin resolver, el "y ahí me di cuenta de...").
3. Convierte ese punto en el hook usando uno de los patrones de `references/hooks.md`.
4. El resto del cuerpo queda intacto — el hook es la puerta de entrada, no un resumen del post.

No elijas el patrón de hook por el formato narrativo usado (Honest Miss, Contrarian Take, etc.) sino por dónde cae la carga emocional dentro de la historia — dos posts del mismo formato pueden necesitar hooks distintos.

### Paso 5 — Entregar
Devuelve siempre, por cada post:
1. Formato elegido (nombre)
2. Por qué ese formato (2 frases)
3. Problema que presenta el post
4. Intención / público principal al que apunta
5. Post completo

## Mantener la secuencia entre publicaciones

Este sistema se usa en rondas sucesivas de "Documentación #". Para mantener coherencia y evitar repetir el mismo formato o problema dos veces seguidas, antes de generar una nueva ronda intenta reunir (pregúntale al usuario si no las tiene a mano):

- **Qué posts ya se publicaron**: formato usado, problema cubierto, público al que apuntó cada uno — para variar y no saturar de "Honest Miss" o de un solo público objetivo.
- **Número de semana o de post en la serie**, si algún formato lo requiere (ej. "Semana 3 de construir X" en Weekly Update).
- **Cualquier feedback de edición** que el usuario haya dado sobre posts anteriores (frases a evitar, tono a ajustar), para no repetir el mismo ajuste cada ronda.
- **Datos pendientes de confirmar con la persona** (stack técnico exacto, nombres de herramientas/brokers, cifras) que quedaron abiertos en rondas anteriores.
- **Reacciones o comentarios reales** que haya recibido un post ya publicado, si el usuario los comparte — son material válido para un futuro Customer Conversation o Pattern Observation.

Si el usuario no lleva este registro, ofrécete a mantenerlo tú (en un archivo o tabla simple) para no perder la secuencia de formatos/problemas/público entre sesiones.
