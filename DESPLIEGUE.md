# Despliegue completo

Guía para dejar funcionando todo: página web (GitHub Pages) + base de datos (Google Sheetscode.gs) + servidor (Google Apps Script). Costo: **gratis**, salvo lo que gaste la API de Anthropic (el límite diario lo controla).

## Cómo encaja todo

```
Navegador (GitHub Pages)  ──►  Apps Script (Web App)  ──►  Google Sheet (base de datos)
   index.html + js/                 Code.gs                  pestañas: Usuarios · Uso · Datos
                                       └──────────────────►  API de Anthropic (y OpenAI, opcional)
```

- La página **no tiene ninguna clave**. Solo conoce la URL pública de la Web App.
- Las claves de IA viven en **Propiedades del script** (Apps Script), cargadas desde tu `.env` local.
- **Cualquiera puede probarlo sin esperar aprobación:** escribe su correo, el servidor lo registra solo en la pestaña **Usuarios** y le da **2 pruebas gratis** (en total por correo).
- Las personas que tú agregas a mano (p. ej. una clienta real) tienen un cupo **diario** y, si quieres, un código de acceso.
- Hay topes diarios globales que protegen tus tokens aunque el enlace se comparta mucho.

## Qué necesitas antes
- Una cuenta de Google. **Usa una personal (Gmail)**: algunas cuentas de empresa (Workspace) bloquean publicar una Web App para "Cualquier persona".
- Una API key de Anthropic: https://console.anthropic.com → API Keys.
- Node.js instalado (solo para `tools/gen-setup.js`; hay alternativa manual en el paso 3).
- Este repo descargado/clonado.

---

## Paso 1 · Crear el Google Sheet
1. Ve a https://sheets.google.com y crea una hoja en blanco. Nómbrala, por ejemplo, **Building in Public – Base de datos**.
2. **No la compartas con nadie**: contendrá correos, memoria y posts de los usuarios. El script corre con tu cuenta y no necesita que otros tengan acceso.

## Paso 2 · Pegar el código del servidor
1. En el Sheet: **Extensiones → Apps Script**.
2. Borra el contenido de `Código.gs` y pega **todo** el contenido de [`apps-script/Code.gs`](apps-script/Code.gs). Guarda (Ctrl+S).
3. Ponle un nombre al proyecto (arriba a la izquierda), por ejemplo `bip-backend`.

## Paso 3 · Cargar las variables de entorno (claves y límites)
Las variables están descritas en [`.env.example`](.env.example).

**Opción A (recomendada): con tu archivo `.env`**
1. Copia `.env.example` como `.env` y completa al menos `ANTHROPIC_API_KEY`.
2. En la carpeta del repo ejecuta:
   ```bash
   node tools/gen-setup.js
   ```
   Esto crea `apps-script/Setup.local.gs` (ignorado por git; contiene tus claves).
3. En Apps Script: botón **+** (Archivos) → **Script**, nómbralo `Setup`, pega el contenido de `Setup.local.gs`, guarda.
4. Arriba, en el selector de funciones elige **`configurar`** → **Ejecutar**. La primera vez pide permisos (ver paso 6, nota de autorización). Debe mostrar `OK: ANTHROPIC_API_KEY, ...`.
5. **Borra el archivo `Setup`** de Apps Script (las claves ya quedaron guardadas en las propiedades) y, si quieres, el `Setup.local.gs` de tu PC.

**Opción B (manual):** Apps Script → ⚙ **Configuración del proyecto** → **Propiedades del script** → *Agregar propiedad*, una por cada variable de `.env.example` que quieras usar (como mínimo `ANTHROPIC_API_KEY`).

| Variable | Obligatoria | Qué hace |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí | Clave de la IA. |
| `ANTHROPIC_MODEL` | No (`claude-sonnet-5-5`) | Modelo que usa. |
| `OPENAI_API_KEY` | No | Activa subir audio (Whisper). Sin ella solo funciona **Dictar**. |
| `DAILY_AI_LIMIT` | No (2) | Generaciones de IA por usuario y día. |
| `DAILY_TRANSCRIBE_LIMIT` | No (2) | Transcripciones de audio por usuario y día. |
| `GLOBAL_DAILY_AI_LIMIT` | No (200) | Tope diario sumando todos los usuarios. |
| `AUTO_REGISTER` | No (`SI`) | `SI`: cualquier correo se registra solo y obtiene pruebas. `NO`: solo entran los correos que tú agregues. |
| `TRIAL_LIMIT` | No (2) | Usos de IA **en total** por correo de prueba (no por día). |
| `TRIAL_GLOBAL_DAILY_LIMIT` | No (30) | Tope diario de usos de prueba sumando **todas** las personas de prueba. |
| `TRIAL_NEW_USERS_DAILY_LIMIT` | No (50) | Correos nuevos que se pueden registrar por día (evita que un bot llene el Sheet). |
| `SHEET_ID` | No | Solo si el script no se creó desde el propio Sheet. |
| `TOKEN_SECRET` | No | Firma de sesiones; si falta se genera solo. |

## Paso 4 · Crear las pestañas
En Apps Script elige la función **`setupSheets`** → **Ejecutar**. Crea tres pestañas en el Sheet:
- **Usuarios**: quién ha entrado. Los correos de prueba se agregan solos aquí (columna `origen` = `prueba`).
- **Uso**: contador diario de IA por usuario (lo escribe el servidor).
- **Datos**: la base de datos (perfil, memoria, posts…). Una fila por elemento.

## Paso 5 · Usuarios: automáticos y manuales
**Pruebas (automático):** no haces nada. Cuando alguien escribe su correo en la página, aparece una fila nueva en **Usuarios** con `activo = SI` y `origen = prueba`. Tiene `TRIAL_LIMIT` usos (2) en total y no puede subir audio.

**Manuales (tú):** agrega una fila para quien quieras darle más (p. ej. una clienta real). Déjala **sin** `origen`:

| correo | nombre | activo | limite_diario | codigo | creado | origen |
|---|---|---|---|---|---|---|
| ana@correo.com | Ana | SI | 10 | ana-2026 | | |

- **correo**: es el "usuario". Se ignoran mayúsculas, espacios, `+etiquetas` y los puntos de Gmail (`a.na+x@gmail.com` = `ana@gmail.com`).
- **activo**: `NO` bloquea el acceso al instante (incluso con sesión abierta), también a un correo de prueba.
- **limite_diario**: usos de IA por **día** para usuarios manuales. Vacío usa `DAILY_AI_LIMIT` (2).
- **codigo** (opcional): código de acceso que esa persona debe escribir. Si un correo manual ya existe, nadie puede "registrarlo" de nuevo para saltarse el código.
- **origen**: `prueba` = usuario automático. Para convertir a alguien de prueba en manual, borra esa celda (y ponle `limite_diario`).
- Para **cerrar el registro abierto** en cualquier momento: `AUTO_REGISTER = NO` en las Propiedades del script.

## Paso 6 · Publicar la Web App
1. Apps Script → **Implementar → Nueva implementación**.
2. Tipo: ⚙ **Aplicación web**.
3. **Ejecutar como: Yo** · **Quién tiene acceso: Cualquier persona**.
4. **Implementar** → autoriza los permisos (cuenta → *Configuración avanzada* → *Ir a bip-backend (no seguro)* → *Permitir*). El aviso aparece porque la app es tuya y no está verificada por Google; es normal.
5. Copia la **URL de la aplicación web** (termina en `/exec`).
6. Compruébala: ábrela en el navegador; debe mostrar `{"ok":true,"service":"building-in-public"}`.

## Paso 7 · Conectar la página con el servidor
La URL no es secreta. Pon en `js/config.js`:
```js
window.BIP_CONFIG = { API_URL: 'https://script.google.com/macros/s/XXXX/exec' };
```
(o pon `APPS_SCRIPT_URL` en `.env` y ejecuta `node tools/gen-setup.js`, que lo escribe por ti).

## Paso 8 · Publicar la página (GitHub Pages)
```bash
git add js/config.js
git commit -m "Configura la URL del servidor"
git push
```
GitHub → **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → Save. La página queda en `https://<usuario>.github.io/<repo>/`.

## Paso 9 · Probar
1. Abre la página (idealmente en una ventana de incógnito) → escribe un correo cualquiera → entras directo y arriba ves `Pruebas: 2 de 2`.
2. En el Sheet, pestaña **Usuarios**: debe haber una fila nueva con ese correo y `origen = prueba`.
3. Escribe un par de frases → **Generar post** → pasa a `1 de 2`. Hazlo otra vez → `0 de 2`.
4. Un tercer intento debe bloquearse con "Ya usaste tus 2 pruebas gratuitas" y tu mensaje de contacto.
5. Entra con una variante del mismo correo (`tu+2@...`): el cupo sigue en 0, no se regala otro.
6. Pestañas **Datos** y **Uso**: filas nuevas y el contador `TOTAL`.
7. Con un usuario **manual** (con `codigo`) comprueba que pide el código y que su límite es **diario**.

**Cargar datos iniciales de una persona:** con su sesión → Memoria → *Importar respaldo* → su archivo JSON (guárdalo en `private/`, que git ignora). Se guarda en su cuenta del Sheet.

---

## Si ya tenías la versión anterior (solo correos aprobados)
1. En Apps Script: pega el nuevo [`Code.gs`](apps-script/Code.gs) (reemplaza todo).
2. Ejecuta **`setupSheets`** otra vez (agrega la columna `origen` a Usuarios; no borra nada).
3. (Opcional) En **Propiedades del script** añade las variables nuevas de la tabla del paso 3. Sin ellas se usan los valores por defecto (registro abierto, 2 pruebas, tope 30/día).
4. **Implementar → Administrar implementaciones → ✏ Editar → Versión: Nueva versión → Implementar.** La URL no cambia.
5. Tus usuarios actuales siguen igual (manuales, con su código y su cupo diario).

## Actualizar el servidor más adelante
Si cambias `Code.gs`: pega el nuevo código → **Implementar → Administrar implementaciones → ✏ Editar → Versión: Nueva versión → Implementar**. La URL **no cambia**. (Si creas una "Nueva implementación" la URL sí cambia.)

## Cómo funcionan los límites
- Cuentan las llamadas a la IA: **generar post, "responder y mejorar" y "otro hook"**. Dictar no cuenta.
- **Pruebas:** `TRIAL_LIMIT` usos **en total** por correo (no se reinician al día siguiente). Sin subida de audio.
- **Usuarios manuales:** cupo **diario** (`limite_diario` o `DAILY_AI_LIMIT`).
- Si la API falla, o si un tope bloquea la petición, el intento **no** se descuenta.
- Tres topes protegen tu gasto, de más fino a más grueso: por correo → `TRIAL_GLOBAL_DAILY_LIMIT` (todas las pruebas juntas) → `GLOBAL_DAILY_AI_LIMIT` (todo el servicio).
- El día cambia a medianoche según la zona horaria del script (⚙ Configuración del proyecto → Zona horaria).
- **Gasto máximo diario por pruebas** = `TRIAL_GLOBAL_DAILY_LIMIT` × lo que cuesta una generación. Para un freno final, fija además un límite de gasto mensual en la consola de Anthropic.

## Seguridad: lo que debes saber
- **El correo no se verifica** (no se envía ningún mensaje de confirmación; así no hay fricción). Consecuencias:
  - Alguien puede escribir un correo ajeno para gastar *sus* 2 pruebas o ver *sus* datos de prueba (que son mínimos). Para usuarios reales **llena siempre la columna `codigo`**.
  - Quien quiera más pruebas puede inventar correos nuevos. No se puede evitar sin verificar el correo; por eso existen `TRIAL_GLOBAL_DAILY_LIMIT` y `TRIAL_NEW_USERS_DAILY_LIMIT`: acotan el daño total por día. Los alias (`+etiqueta`, puntos de Gmail) ya cuentan como el mismo correo.
- Los correos de quienes prueban quedan guardados en tu Sheet: trátalos como datos personales (no los compartas ni los uses para algo distinto sin avisar).
- Los mensajes de error no distinguen "no existe" de "inactivo", pero con intentos repetidos alguien podría averiguar qué correos están en la lista. No pongas correos que no quieras exponer.
- Las sesiones duran 30 días y se invalidan si pasas el usuario a `NO`.
- Las claves de IA nunca llegan al navegador ni al repo. `.env` y `apps-script/Setup.local.gs` están en `.gitignore`: **no los subas**. Si una clave se filtra, revócala en la consola de Anthropic y vuelve a ejecutar el paso 3.
- El prompt lo arma la página y el servidor lo reenvía a la IA. Un usuario autorizado podría enviar su propio texto, pero está limitado en tamaño (60 000 + 20 000 caracteres, 4 000 tokens de salida) y por el cupo diario.
- El Sheet contiene datos personales: mantenlo **privado**.
- **Dos dispositivos a la vez**: gana el último guardado (sin fusión). Evita editar el mismo usuario en dos pantallas a la vez.
- Cada elemento (un post, una transcripción) no puede pasar de ~49 000 caracteres (límite de una celda de Sheets).

## Cuotas gratuitas de Google (referencia)
Apps Script gratuito permite unas 20 000 llamadas externas (`UrlFetch`) y 6 horas de ejecución al día, con 6 minutos máximo por ejecución. Para un uso de prueba o de unas pocas personas sobra.

## Problemas frecuentes
| Síntoma | Causa y solución |
|---|---|
| La página dice "Falta configurar el servidor" | `API_URL` está vacío en `js/config.js`, o no se publicó el cambio (paso 7–8). |
| "El servidor respondió algo inesperado" | La Web App no está en *Cualquier persona*, o la URL no termina en `/exec`. Revisa el paso 6. |
| "Falta la pestaña…" | No ejecutaste `setupSheets` (paso 4). |
| "Falta ANTHROPIC_API_KEY en el servidor" | Paso 3 incompleto: revisa Propiedades del script. |
| "Ese correo no tiene acceso" | El correo no está en **Usuarios**, tiene `activo = NO` o hay un error de tipeo. |
| Cambié `Code.gs` y no se nota | Falta publicar **nueva versión** (ver "Actualizar el servidor"). |
| "No se pudo guardar · reintentar" | Sin internet, sesión vencida o un elemento demasiado largo. El mensaje del aviso lo indica. |

## Probar sin Google (desarrollo)
El mismo `Code.gs` corre en memoria con Google simulado:
```bash
node apps-script/test/test.js          # 28 pruebas: login, auto-registro, datos, límites, seguridad
node apps-script/test/dev-backend.js   # servidor local en :8787 (cualquier correo se auto-registra)
node tools/serve.js                    # la página en :5173
```
Para usar el backend local, pon temporalmente `API_URL: 'http://localhost:8787'` en `js/config.js` (y no lo subas).
