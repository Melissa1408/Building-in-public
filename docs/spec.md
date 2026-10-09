# Especificación funcional (v0.1)

Deriva del paquete de traspaso original (material privado). **Aviso:** la "ingeniería inversa" (Capas 0 a 5), la tabla de mapeo problema→formato y los ejemplos aprobados de la persona no se recibieron como archivos; lo de abajo cubre lo que sí está en la skill y el paquete. Cuando lleguen, añadirlos como *golden examples* en `skill/references/`.

## Flujo (basado en la skill)
1. Captura (texto, dictado o audio) → 2. clasificar problema → 3. elegir formato (15) → 4. verificar completitud (preguntas si falta material) → 5. redactar cuerpo casi textual → 6. hook reescrito (6 patrones) → 7. entrega: formato, por qué, problema, público, post.

## Modelo de datos (`localStorage["bip.v1"]`)
| Entidad | Campos |
|---|---|
| profile | nombre, rol, nivel, proyecto, etapa, tono, noEs |
| brief, pilares | texto libre; lista |
| audiences | nombre, busca, evitar |
| constraints | lista de reglas |
| captures | id, fecha, texto (transcripción cruda) |
| posts | formato, tipo, problema, publico, patronHook, hook, cuerpo, estado (borrador/editado/publicado), fechaPlan, fechaPub, pendientes[], memoriaSugerida[] |
| memory | notas del "cerebro": hechos y rasgos de voz |
| feedback | correcciones de edición |
| abiertos | datos pendientes con ella (stack, brokers, tercera decisión) |
| settings | apiKey, model, openaiKey, lang, slots (cadencia) |

La secuencia (log) se deriva de `posts`: alimenta rotación, alertas y el prompt.

## Cerebro
El prompt incluye perfil, brief, público, restricciones, memoria (últimas 60 notas), últimas 8 transcripciones (para imitar su voz), últimas 15 correcciones y los últimos 12 posts. Cada generación propone notas nuevas de memoria que ella acepta con un clic.

## Alertas
Mismo formato o público en posts consecutivos · datos faltantes con la pregunta exacta · pendientes abiertos · huecos libres de la semana · falta de API key.

## Fuera de alcance (por ahora)
Publicar vía API de LinkedIn · métricas de LinkedIn · multiusuario.
