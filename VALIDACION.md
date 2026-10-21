# Validación de mialacena

Revisión contra la lista de requisitos, hecha el **21 de octubre de 2026** con la app
corriendo y navegándola de punta a punta en un navegador real (Chromium, pantalla de
teléfono 430 × 900), más 10 pruebas de lógica sobre el cálculo de faltantes y el Excel.

**Resultado: los 11 requisitos están cubiertos y funcionando (33/33 comprobaciones en
navegador y 10/10 de lógica).** Durante la revisión se reforzaron dos puntos débiles;
el detalle está al final.

La **sección 5** cubre las dos funciones que se agregaron después: el respaldo en archivo y
«al finalizar, ya está en casa».

---

## 1. Requisito por requisito

| # | Lo que pediste | ¿Está? | Dónde vive | Cómo se comprobó |
|---|---|---|---|---|
| 1 | Tomar **una foto, varias fotos o un video** de la alacena | Sí | `src/components/view-scan.tsx` | El selector de fotos acepta varias (`multiple`) y usa la cámara trasera (`capture="environment"`); el de video también. Se cargaron 2 fotos y se generaron 2 miniaturas; se subió un video real y se extrajeron **4 cuadros** automáticamente |
| 2 | **Configurar la despensa** con todo lo que debe de tener, **con opción a marcas** | Sí | `src/components/view-despensa.tsx`, `src/lib/types.ts` | Se agregó «Café de olla» con marca «Legal», categoría, cantidad, unidad y precio; quedó listado y el contador de Hoy pasó de 16 a 17. Al escribir el nombre sugiere marcas del catálogo público Open Food Facts |
| 3 | Que al tomar la foto o el video **te diga qué falta** | Sí | `src/lib/scan.functions.ts` + `src/lib/match.ts` | El botón «Decirme qué falta» manda las fotos (comprimidas en el teléfono) a la lectura y compara contra tu despensa. Muestra por producto: **Está / Falta / Faltan N**. Sin IA disponible cae con aviso claro y queda el modo manual «O márcalo tú» |
| 4 | **Generar un Excel descargable** y amigable | Sí | `src/lib/excel.ts`, `src/lib/zip.ts` | Se descargó `mialacena-2026-10-21.xlsx` y se abrió: título, fecha, **encabezado con color**, filas alternadas, formato de moneda, «Sí/No» en verde, **panel congelado**, autofiltro, Total de la lista y Ya en el carrito. Disponible en la lista abierta y en cada lista guardada |
| 5 | **Botón en cada producto** para marcar si ya lo llevas | Sí | `src/components/view-lista.tsx` | Cada tarjeta tiene «Aún no lo llevo / Ya lo llevo»; al marcarlo se tacha y se suma al subtotal «En el carrito» |
| 6 | Y si es **uno o más del mismo** | Sí | `src/components/view-lista.tsx` | Botones **−** y **+** por producto y campo editable para fracciones (0.5 kg, 2.5 L…). Probado: 1 → 2 |
| 7 | **Precio** | Sí | `src/components/view-lista.tsx` | Campo de precio unitario por producto; se precarga con el precio habitual de la despensa. Probado: 30 → el importe se recalculó |
| 8 | Que te diga **cuánto fue en total** | Sí | `src/lib/money.ts` | Total grande arriba de la lista, subtotal de lo ya echado al carrito y contador «N de M». Verificado: la suma de importes (1197) coincide con el total mostrado |
| 9 | **Botón de finalizar** | Sí | `src/lib/store.ts` → `finishList` | Pide confirmación, guarda la compra con su total, libera la lista y te lleva a Guardadas |
| 10 | Botón para **hacer lo mismo cada vez que quieras** | Sí | `src/components/view-lista.tsx`, `view-saved.tsx` | **Nueva** (empezar otra vez, con confirmación si hay productos) y **Repetir** en cada lista guardada: reabre la misma lista con los productos sin marcar. Probado: 14 productos reabiertos, 0 marcados |
| 11 | **Guardar la lista** cada que quieras | Sí | `src/lib/store.ts` → `saveSnapshot` | **Guardar** deja una copia en Guardadas; se puede guardar la misma lista todas las veces que quieras. Probado con 3 guardados seguidos, cada uno con su nombre |

Extras que ya trae: modo oscuro/claro, instalable como app, borrado de todos los datos
desde Privacidad, funcionamiento sin red (todo se guarda en el teléfono) y aviso de que
las fotos no se almacenan.

---

## 2. Cómo se validó

- **Recorrido completo en navegador** (Chromium headless, viewport de teléfono): configurar
  despensa → escanear con fotos → escanear con video → armar la lista → marcar productos →
  cambiar cantidades y precios → verificar el total → descargar el Excel → guardar →
  finalizar → repetir → nueva. **33 de 33 comprobaciones OK, sin errores de JavaScript.**
- **Pruebas de lógica** (`npm test` → `src/lib/pantry.test.ts`, 10/10): el cálculo de
  «qué falta» (falta total, falta parcial «faltan N», respeto de marca, sin contar dos
  veces el mismo producto, ofrecer agregar lo que no está en la despensa), la suma de
  cantidad × precio y el contenido del Excel.
- **El Excel se abrió y revisó por fuera**: ZIP válido, 6 partes OOXML, hoja «Lista»,
  panel congelado en A5, autofiltro A4:G18, formato `$#,##0.00`, encabezado terracota
  `FFC4622D`, filas alternadas, totales al final.
- `npm run typecheck` limpio y `npm run build` completo sin errores.

---

## 3. Lo que se reforzó en esta revisión

1. **El Excel ahora es un `.xlsx` de verdad.** Antes se generaba un XML de Excel 2003
   guardado como `.xls`, que en Google Sheets y en el Excel de celular se abre mal o
   avisa que el formato no coincide. Ahora se arma el contenedor OOXML a mano
   (`src/lib/zip.ts`, sin dependencias nuevas) y el archivo abre igual en Excel,
   LibreOffice, Numbers y Google Sheets, con panel congelado y autofiltro.

2. **Las listas guardadas ya se distinguen.** Antes todas se llamaban igual
   («Faltantes del escaneo»), así que guardar varias veces dejaba filas idénticas en
   Guardadas. Ahora el título de la lista es **editable** (lápiz junto al total) y al
   guardar o finalizar se le agrega la fecha si el nombre es el de siempre o si ya está
   en uso: `Compra de la semana`, `Compra de la semana · 21 oct, 06:10 a.m.`, …

3. Detalles menores: etiquetas de la navegación legibles para lectores de pantalla
   (antes el contador se leía como «14Lista»), aviso al guardar con el nombre que se usó,
   y limpieza de código muerto.

---

## 4. Notas

- La **lectura automática con IA** no se pudo probar de punta a punta aquí porque este
  entorno no tiene la clave del servicio. Sí se probó que el botón llega al servidor y
  que, cuando no hay servicio, responde con un aviso y deja el camino manual. En el
  despliegue la plataforma inyecta esa clave y la lectura queda activa.
- `npm test` incluye además las pruebas de la plantilla; 16 de esas fallan en este
  entorno porque falta la carpeta `.grok/` (no viene en el repositorio). Son fallos
  previos, ajenos a las funciones de la app.
- Se agregó `allowedHosts: true` al servidor de desarrollo en `vite.config.ts` para que
  la vista previa funcione con el dominio público del entorno. Solo afecta al modo
  desarrollo.

---

## 5. Respaldo y «al finalizar, ya está en casa»

Agregado y validado el **21 de octubre de 2026**: 57 de 57 comprobaciones en navegador
(Chromium, pantalla de teléfono 390 × 844, zona horaria de la Ciudad de México) y 18 pruebas
de lógica nuevas.

| Lo que pediste | ¿Está? | Dónde vive | Cómo se comprobó |
|---|---|---|---|
| **Un botón guarda la despensa y las listas en un archivo** | Sí | `src/components/backup-card.tsx`, `src/lib/backup.ts`, `src/lib/save-file.ts` | Tarjeta «Respaldo» en Hoy. Se descargó `mialacena-respaldo-2026-10-21.json` y se revisó: 16 productos, lista abierta, lista guardada, última lectura y marcas de repuesto. Debajo queda «Último respaldo: 21 oct, 01:18 a.m.». En iPhone abre la hoja de compartir («Guardar en Archivos», AirDrop…); si se cancela, no cuenta como respaldo |
| **Otro botón lo vuelve a cargar si cambias de aparato** | Sí | `src/components/backup-card.tsx`, `src/lib/store.ts` → `restoreBackup` | En un segundo teléfono (sin datos) se cargó ese archivo. Antes de reemplazar, muestra qué trae (16 productos · 1 guardada · 1 en la lista abierta) y qué se va a perder; con «Cancelar» no cambia nada. Al cargar, el segundo teléfono quedó **idéntico** al primero, campo por campo |
| **Al terminar, lo que marcaste como llevado cuenta como repuesto** | Sí | `src/lib/restock.ts`, `src/lib/store.ts` → `finishList` | Se marcaron 5 de 12 como «Ya lo llevo» y se finalizó. El diálogo avisa «Ya en casa: 5 productos» antes de confirmar; al finalizar, la despensa marcó justo esos 5. Hoy pasó de «Vistos 4 · Faltan 12» a «Vistos 4 · **Repuestos 5** · Faltan 7» |
| **…hasta el próximo escaneo** | Sí | `src/lib/store.ts` → `rememberScan`, `src/components/view-scan.tsx` | En Escanear, lo repuesto entra ya activado en «O márcalo tú» (con etiqueta «Repuesto»). Al armar la lista se borraron todas las marcas y Hoy volvió a dos recuadros. Una lectura con foto hace lo mismo |

**Cómo funciona, en detalle**

- **Qué cuenta como repuesto:** los renglones marcados como llevados que son de la despensa.
  Los extras de la visita no cuentan, un producto repetido cuenta una vez y lo que ya no está
  en la despensa se ignora. Si nada de la despensa se marcó, el diálogo lo dice y la despensa
  queda igual.
- **Dónde se ve:** en Hoy (recuadro «Repuestos» y la nota «Ya en casa: 5 productos de tu
  compra del 21 oct…», aunque todavía no haya una lectura), en Despensa (insignia
  «Repuesto · 21 oct») y en Escanear (aviso y casillas ya activadas).
- **Qué la quita:** el próximo escaneo, con foto o a mano. Revisar a mano ahora sí queda como
  última lectura, como pide «hasta el próximo escaneo»; antes no se registraba. «¡Se acabó!»
  quita la marca de ese producto, porque ya no está en casa.
- **Caducidades:** al reponer un producto vencido o por vencer se quita esa fecha (llegó un
  empaque nuevo) y no se vuelve a mandar solo a la lista. Una fecha lejana se conserva.
- **Qué guarda el respaldo:** la despensa (con marcas, precios, caducidades y repuestos), la
  lista abierta, las guardadas, la última lectura, el tema y el modo una mano. No guarda la
  pestaña abierta ni los avisos. Es un JSON legible con un encabezado
  (`app`, `kind`, `version`, `exportedAt`) para reconocerlo y poder cambiar el formato
  después sin romper respaldos viejos.
- **Al cargar se valida:** un archivo que no es respaldo (otro JSON, una foto) o de una
  versión más nueva se rechaza con un aviso claro y no toca nada. Si un registro viene dañado
  se omite o se corrige (sin nombre se omite, unidad desconocida pasa a «pza», ids repetidos se
  quedan una vez) en vez de tirar todo el respaldo. Tope de 5 MB.
- Si alguien agrega un campo nuevo a un producto o a una lista y no lo suma al respaldo, el
  typecheck falla. Así el respaldo no pierde datos en silencio.

**Lo que se corrigió en el camino**

1. **Las hojas de confirmación se abrían fuera de la pantalla.** La animación de entrada de
   las vistas (`.rise`) se quedaba con `filter`/`transform` aplicados, y eso hace que los
   elementos `position: fixed` se acomoden al contenido y no a la pantalla. En una lista
   larga, al tocar «Finalizar» se oscurecía todo pero la hoja quedaba al fondo de la página,
   detrás de la navegación. Pasaba con todas las hojas dentro de las vistas. Se corrigió en
   `src/styles.css` (la animación se ve igual) y se comprobó que la hoja queda abajo de la
   pantalla.
2. **Las caducidades se comparaban con el día en UTC.** Desde las 6 p.m. en la Ciudad de
   México la app ya creía que era mañana, así que lo que vencía al día siguiente se daba por
   vencido y se mandaba a la lista un día antes. Ahora se usa el día local, igual que el campo
   de fecha (`src/lib/dates.ts`). Se probó con el reloj fijo a las 8 p.m.: lo que vence hoy
   pasa a la lista y lo que vence mañana se queda en «Vence pronto».

**Cómo se validó**

- **Navegador**, 57/57 comprobaciones sin errores de JavaScript:
  - reponer de punta a punta: 18;
  - respaldo entre dos teléfonos, con archivos equivocados, «Cancelar» y la hoja de compartir
    de iPhone: 26;
  - finalizar sin nada llevado, repuestos sin lectura previa, tema claro, pantalla de 320 px y
    Privacidad: 6;
  - datos guardados con la versión anterior y fechas locales: 7.
- **Datos de antes:** un teléfono con datos de la versión anterior abre igual. No se cambió el
  formato guardado, solo se agregaron campos opcionales, y las lecturas viejas se siguen
  mostrando con sus mismos números.
- **Lógica:** `src/lib/backup.test.ts` (8) cubre ida y vuelta sin perder campos, rechazos,
  registros dañados, BOM y nombre del archivo. `src/lib/restock.test.ts` (10) cubre qué
  cuenta como llevado, caducidades, el resumen de Hoy, lecturas viejas y el store completo
  (finalizar, escanear, «¡Se acabó!», caducidades, cargar respaldo y borrar). Ambas se
  agregaron a `npm test` y pasan también con la zona horaria en UTC+14 y UTC−11.
- `tsc` limpio, `npm run build` completo y `eslint` sin avisos nuevos (queda uno menos que
  antes). Las 16 fallas de las pruebas de la plantilla son las mismas que en el commit base.

---

## 6. Corrección de errores y avisos (revisión del 21 de octubre de 2026)

Pasada de calidad sobre el código y las herramientas, sin cambiar el formato de los datos
guardados ni el comportamiento visible, salvo el nombre de la app instalada, que ahora sí es
el suyo.

| Comprobación | Antes | Después |
|---|---|---|
| `npm run lint` | 1 error y 5 avisos | 0 problemas |
| `npm run typecheck` | limpio | limpio |
| `npm test` | 16 fallas (181 de 197) | 0 fallas (193 de 198, 5 omitidas a propósito; 107 de 107 de la app) |
| `npm run build` | 20 avisos de Rolldown | 0 avisos, 0 errores |
| `npm install` | 2 avisos `EBADENGINE` | 1 (solo de una dependencia) |
| Manifest y tutorial de instalación | «Grok App» | «mialacena» |
| Servidor de desarrollo | — | `/`, `/privacidad`, favicon, og.jpg, manifest y `/__app-env` responden 200 |
| Datos guardados de la versión anterior | error de consola de zustand al migrar | carga sin error |

### Lo que se corrigió

1. **Un error de ESLint y cinco importaciones muertas.** Sobraban `TextField` en
   `barcode-modal.tsx`, `Check`, `Upload` y `mxn` en `ticket-modal.tsx`, y `PACKAGE_TYPES`
   en `view-scan.tsx`. El `catch {}` vacío de `app-data/client.server.ts` ahora explica por
   qué ignora un JWT ilegible (se cae al hash del token completo).

2. **Las 16 fallas de `npm test` no eran fallas de la app.** Tenían tres causas, todas de
   pruebas de la plantilla que daban por hecho el entorno del sandbox:
   - **Cuatro** pruebas leían documentos que viven en `.grok/`, una carpeta que está en
     `.gitignore` y no viene en el repositorio. Ahora se omiten con un motivo claro cuando
     no existe; si el sandbox trae la carpeta, se siguen ejecutando.
   - **Ocho** pruebas de la cabecera PWA suponían un proyecto sin tarjeta propia
     (`public/og.jpg`) ni `src/lib/og/site.json`, así que el título y la tarjeta reales de
     mialacena ganaban y rompían sus expectativas. Ahora fijan el directorio de trabajo a
     una carpeta vacía y siguen comprobando la mecánica de la plataforma.
   - **Cuatro** esperaban `VITE_AUTH_ENABLED=false`, que solo existe en
     `.grok/app-env.json` (ausente por la misma razón). Ahora comprueban el valor que el
     wrapper resuelve de verdad: sin archivo, «sign-in on», que es el comportamiento
     documentado.

3. **El nombre de la app instalada.** El manifest y el tutorial de instalación usaban solo
   el slug del host, así que en la vista previa, en un dominio propio o en Vercel la app se
   instalaba como «Grok App». Ahora usan el `title` de `src/lib/og/site.json` y, si no hay,
   el slug del host como antes. Comprobado en el servidor: `name` y `short_name` son
   `mialacena`, y el tutorial dice «Add mialacena to your Home Screen».

4. **Node.** `engines` pedía `24.x` mientras el contenedor, `AGENTS.md` y el runtime de Nitro
   usan Node 22. Ahora pide `>=22.22.0` (sigue aceptando 24) y la instalación deja de avisar
   por el proyecto.

5. **Los 20 avisos del build** (`MODULE_LEVEL_DIRECTIVE`) venían de los `"use client"` de
   `@tanstack/react-router`, no del código de la app: en un bundle sin React Server
   Components son inertes. Se filtran en el logger de Vite solo cuando la ruta está en
   `node_modules/`; cualquier otro aviso sigue saliendo. `npm run build` queda limpio.

6. **Datos guardados de la versión anterior.** El store está en `version: 2` y no tenía
   `migrate`, así que zustand abría un teléfono con datos de la versión 1 registrando
   «State loaded from storage couldn't be migrated». Ahora devuelve lo guardado y los campos
   nuevos toman su valor por defecto; el formato del respaldo y de `localStorage` no cambia.

### Avisos que no se corrigen desde este repositorio

- **`@zxing/library` pide Node ≥ 24** en su `engines`, aunque se usa solo en el navegador
  (lector de códigos). npm avisa al instalar; no afecta a la app ni al build. Evitarlo
  obligaría a bajar de versión la librería.
- **`npm` marca como deprecadas `recharts@2` y `eslint@9`.** Son dependencias de la
  plantilla que esta app no usa (`recharts`, los Radix y otras no se importan en `src/`).
  Actualizarlas exige saltos mayores que no aportan nada aquí.
- **`npm run check:auth` informa «sign-in on»** porque `.grok/app-env.json` no está en el
  repositorio. La app no muestra ninguna pantalla de acceso, así que no cambia nada
  visible; el chequeo sirve para comprobar que dev y build coinciden, y coinciden.

### Cómo se comprobó

- `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, todos en verde con los
  números de la tabla.
- `node scripts/brand-check.mjs --root .` → `ok: true`, 0 avisos (tarjeta de 1200 × 630,
  35 KB).
- Servidor real (`npm run dev`): las rutas de la tabla responden 200 y el HTML servido lleva
  `og:title`, `og:description`, `twitter:card` y el manifest con el nombre correcto.
- Build de producción servido con `npm run preview`: `/`, `/privacidad`, el manifest y el
  tutorial de instalación responden 200; el manifest y el tutorial ya dicen «mialacena» y
  la cabecera sale del middleware de Nitro, no solo del servidor de desarrollo.
- **Sin navegador en esta pasada:** Playwright no pudo descargar Chromium en este entorno
  (`Download failure`), así que no se repitió la navegación de punta a punta de las
  secciones 4 y 5. Lo anterior sigue vigente; lo nuevo se validó con pruebas, build y
  peticiones HTTP reales.

## 7. Revisión de diseño, rendimiento y seguridad (21 de octubre de 2026)

### Diseño: «mercado vivo» (sin minimalismo)

- Nuevo sistema visual en `src/styles.css`: paleta ampliada (sol, cielo, agua, baya, uva,
  lima además de clay/sage), tarjetas tipo sticker con borde y sombra de color
  (`card-pop` + variantes), botones con cuerpo (`btn-chunky`), héroe con degradado y
  confeti, chips de categoría con color por anaquel (`src/lib/colors.ts`), y animaciones
  suaves (rise, pop-in, wiggle, brillo en barras de progreso) que respetan
  `prefers-reduced-motion`.
- Encabezado y navegación con acentos por pestaña, botón de escaneo elevado y avisos
  tipo toast con color. La vista Hoy tiene saludo del día, héroe y mosaico de cifras.
- El tema por defecto es el claro (soleado); el oscuro sigue en el interruptor y se
  respeta lo que cada quien haya elegido antes.
- Verificado con capturas reales (Chromium headless) en 390×844: Hoy, Despensa, Lista,
  Privacidad y tema oscuro. (Playwright no descarga su Chromium en este entorno; se usó
  el binario de `@sparticuz/chromium`, sin guardar en el proyecto.)

### Base de datos: ¿conviene indexar?

- **Los datos de la app no están en SQL** (despensa, listas y precios viven en
  `localStorage`), así que no hay tablas propias que indexar. Lo único en la base es el
  esquema de identidad de `migrations/auth/0001_auth.sql` (opt-in).
- Sí faltaban índices que Better Auth sí usa: `account (providerId, accountId)` para el
  inicio de sesión federado y `session`/`verification (expiresAt)` para la limpieza de
  vencidos. Se agregaron en **`migrations/0002_auth_indexes.sql`**, con guarda
  `to_regclass` para que sea no-op donde el esquema de auth no exista (probado contra
  PGLite en ambos casos y re-ejecutable). El orden 0001 → 0002 cubre el día en que el
  esquema se copie a `migrations/`.
- `scripts/migration-plan.test.mjs` se ajustó para seguir exigiendo lo importante (que
  `0001_auth.sql` nunca se promueva solo) sin prohibir migraciones propias de la app.

### Caché

- Política HTTP compartida (`scripts/http-headers.mjs`) aplicada en dev (plugin de Vite),
  en Nitro/Vercel (`server/middleware/00-headers.ts`) y en las respuestas fabricadas del
  middleware PWA: assets con hash → `immutable` 1 año; íconos/manifest → 1 hora; HTML →
  `no-cache` (revalida con ETag); `/api/auth/*` y lo que no es GET → `no-store`.
- Las consultas a APIs públicas ya tenían caché TTL en servidor (`ttlCache` y el caché de
  catálogo); se mantienen.

### Seguridad (habilidades activas)

- **CSP estricta** con lo que la app usa de verdad: `img-src` incluye `data:/blob:` (fotos
  locales), `connect-src https:` (APIs públicas y HMR en dev), `worker-src blob:`
  (Tesseract/ZXing), `frame-ancestors` con los orígenes de la vista previa (sin
  `X-Frame-Options`, que no puede expresar esa lista y rompería el iframe). Además:
  `nosniff`, `referrer-policy`, `permissions-policy` (solo cámara y ubicación de esta
  página), HSTS sobre https, `base-uri`, `form-action`, `object-src 'none'`.
- **Límite de frecuencia** por IP en las funciones del servidor que hacen de proxy
  (`src/lib/rate-limit.ts` + `.server.ts`), con techo más bajo en las llamadas con IA
  (`scan`/`ticket`, 8/min). El conteo se poda solo y no guarda datos personales.
- Timeout de 8 s en la búsqueda de catálogo (un upstream colgado ya no retiene procesos).
- `rel="noopener noreferrer"` explícito en todos los `target="_blank"`.
- **Vulnerabilidades:** `npm audit` → 0 advisories en dependencias. Revisión de código:
  sin `innerHTML` con datos del usuario, validadores (zod/manual) en todas las funciones
  del servidor, URLs de APIs públicas construidas con `URL`/`encodeURIComponent`, y el
  aislamiento `Sec-Fetch-Site` de auth sigue intacto.

### Código muerto

- Eliminado `src/lib/multiplayer/` (P2P de la plantilla, sin ningún importador).
- Eliminada `gradeLabel` (`src/lib/off.ts`, sin uso) y des-exportados símbolos que solo se
  usan dentro de su módulo (`BACKUP_APP`, `BACKUP_KIND`, `STYLES_XML`, `xlsxBlob`,
  `OFF_FIELDS`, `normalizeUnitFamily`, `formatUnitWord`, `INGREDIENT_EN`,
  `mealIngredients`). El andamiaje de plataforma (auth/, app-data/, preview-*) se respeta.

### Políticas de privacidad (pestaña propia)

- `/privacidad` reescrita como **Aviso de privacidad** completo y con el diseño nuevo:
  qué se guarda y qué no, respaldo, fotos/video, servicios públicos con lo mínimo que
  recibe cada uno, cookies/almacenamiento local, seguridad, derechos ARCO, cambios al
  aviso, contacto y «Borrar este teléfono». Accesible desde el encabezado (escudo) y
  desde Hoy.

### Cómo se comprobó

- `npm run typecheck`, `npm run lint`, `npm test` (305 pruebas, 0 fallos) y `npm run build`
  en verde; el bundle de producción incluye el middleware de encabezados y la migración
  se aplica tanto en PGLite (dev/preview) como en `npm run db:migrate` (deploy).
- `curl` al dev server: HTML con CSP completa y `no-cache`; `/favicon.svg` con
  `public, max-age=3600`; POST sin caché.
- Capturas headless de Hoy/Despensa/Lista/Privacidad en claro y oscuro, sin errores de
  consola bloqueantes.
