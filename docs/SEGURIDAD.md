# Seguridad de mialacena

Revisión hecha el **23 de octubre de 2026** sobre la rama `main` del repositorio,
con `npm audit`, `npm run lint`, `npm run typecheck`, la batería de pruebas y el
servidor de desarrollo respondiendo en vivo (encabezados verificados con `curl`).
Este documento resume **qué se revisó, qué se corrigió y qué riesgos quedan**.

## 1. Modelo de seguridad (por qué es distinto a una app con cuentas)

mialacena es **local-first**: la despensa, las listas, los precios y las fotos
viven en el almacenamiento del teléfono. No hay cuentas, ni base de datos de
usuarios, ni subida de datos personales. Lo único que expone la app son:

1. **Server functions** que consultan APIs públicas (código de barras, recetas,
   precios, feriados, tipo de cambio).
2. **Dos llamadas con IA** que solo corren cuando la persona pulsa el botón
   (leer la alacena, leer un ticket).
3. **Llamadas del navegador** al mapa (Overpass/Nominatim) y al CDN del OCR.

Eso reduce el daño posible de casi cualquier fallo: no hay sesión que robar, ni
tabla con datos de personas, ni panel de administración.

## 2. Medidas aplicadas

### Encabezados HTTP (`scripts/http-headers.mjs`)

Sirven a los tres consumidores (dev, Nitro/Vercel, respuestas fabricadas) para
que no haya diferencias entre vista previa y producción.

| Encabezado | Valor | Para qué |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` | Evita inyección de scripts, `<base>` y envío de formularios a terceros |
| `connect-src` | `'self'` + **hosts enumerados** (Overpass, Nominatim, jsDelivr, tessdata) | Antes era `https:` (cualquier host); ahora solo los servicios que la app usa |
| `img-src` | `'self' data: blob:` + catálogos públicos y TheMealDB | Solo fotos de producto y recetas |
| `worker-src` | `'self' blob: https://cdn.jsdelivr.net` | Worker del OCR local |
| `frame-ancestors` | lista de visores permitidos (e2b, grok, vercel, arena) | Anti-clickjacking sin romper la vista previa |
| `cross-origin-opener-policy` | `same-origin-allow-popups` | Aísla la ventana de un `opener` ajeno; conserva el popup de sesión |
| `cross-origin-resource-policy` | `same-origin` | Los recursos de la app no se consumen desde otros sitios |
| `x-content-type-options` | `nosniff` | Sin adivinar tipos MIME |
| `referrer-policy` | `strict-origin-when-cross-origin` | No se filtra la ruta interna a terceros |
| `permissions-policy` | cámara y ubicación `(self)`; micrófono, pago, usb y topics apagados | Solo lo que la app necesita |
| `strict-transport-security` | 1 año | Solo sobre HTTPS |

`'unsafe-inline'` en `script-src` se conserva porque el arranque del tema se
inyecta en línea en el HTML; `'unsafe-eval'` aparece **solo en desarrollo** (lo
necesita el runner de Vite). Se agregó `scripts/http-headers.test.mjs` para que
la política no se relaje sin que falle la suite.

### Límites de frecuencia (`src/lib/rate-limit.ts`)

Un permiso por IP y por función, con poda automática y tope de 2 000 cubetas:

| Función | Límite |
|---|---|
| Leer la alacena / leer un ticket | 8 por minuto |
| Recetas | 12 por minuto |
| Feriados | 12 por minuto |
| Tipo de cambio | 20 por minuto |
| Catálogo y búsquedas | 24 por minuto |
| Ficha, precios, código de barras | 30 por minuto |

La IP se toma de los encabezados que pone la plataforma (`x-vercel-forwarded-for`,
`x-real-ip`) antes que de un `x-forwarded-for` que el cliente podría inventar, y
se sanea a caracteres de IP. Es defensa en profundidad: el contador es por
instancia y **no identifica ni guarda** a nadie.

### Validación de entradas

- **Fotos**: solo `data:image/jpeg;base64,` (PNG en tickets), máximo 4 fotos de
  1.2 M caracteres, tope de 4 M en conjunto; ticket individual de 2.5 M. Antes el
  ticket no tenía tope de tamaño (posible agotamiento de memoria).
- **Código de barras**: solo dígitos, 5–24, con una sola función (`cleanBarcode`).
- **Texto**: recortado y sin caracteres de control antes de guardar o mostrar.
- **Recetas con IA**: máximo 4 recetas, nombres de 90 caracteres, listas topadas.
- **Código de IA**: se extrae el JSON sin `eval` y se valida campo por campo.
- **Tipo de cambio**: moneda de 3 letras; el respaldo por entorno exige un
  número positivo razonable.

### Secretos y datos

- `XAI_API_KEY` y `DATABASE_URL` **solo** se leen en el servidor
  (`src/lib/ai.server.ts`, `src/lib/env.server.ts`); nunca llegan al navegador.
- Ningún secreto vive en el repositorio ni en `.env` (no existe `.env`).
- No se registra en consola ni en logs el contenido de fotos, listas o precios.
- La caché del servidor guarda fichas y tipos de cambio **sin asociarlos a una
  persona**; la caché del navegador es solo en memoria y se limpia al usar
  «Borrar datos de este teléfono».

### Dependencias

- `npm audit` (con y sin `--omit=dev`): **0 vulnerabilidades**.
- Se retiraron **121 paquetes** que la app no importaba (Radix, recharts, cmdk,
  vaul, react-table, react-hook-form, date-fns, sonner, react-query…). Menos
  superficie de suministro y menos peso de instalación.
- `@zxing/library` 0.23 exigía Node ≥ 24 (el proyecto declara ≥ 22.22 y el
  sandbox trae 22): se fijó `@zxing/browser` 0.1.5 + `@zxing/library` 0.21.3, que
  es la combinación soportada por Node 22 y mantiene la misma API usada.
- No se encontró `eval`, `new Function` ni `dangerouslySetInnerHTML` con datos
  de la persona (el único uso es una constante de arranque del tema).

### Superficie del servidor

- No hay rutas propias con SQL de entrada del usuario: no hay inyección posible.
- Las server functions no aceptan URLs del cliente (no hay SSRF): los hosts están
  fijos en el código.
- Los enlaces externos usan `rel="noopener noreferrer"`.
- No hay `fs` en rutas de la app ni escritura en disco en producción.

## 3. Riesgos residuales (honestos)

1. **La lectura con IA manda fotos a un tercero** cuando la persona la usa. Está
   dicho en el aviso de privacidad; no se guardan en el servidor de la app.
2. **El almacenamiento local no está cifrado**: queda protegido por el bloqueo
   del teléfono y por el navegador. Los respaldos JSON tampoco están cifrados.
3. **El límite de frecuencia es por instancia** (serverless): frena abuso casual,
   no un ataque distribuido. Para eso haría falta un almacén compartido (p. ej.
   Upstash/Redis), que hoy no hace falta para el perfil de uso de la app.
4. **`'unsafe-inline'` en `script-src`** es una concesión al arranque del tema;
   quitarla exige moverlo a un archivo con hash.
5. **La CSP permite jsDelivr** por el OCR local de Tesseract.js. Si se prefiere
   cero CDNs, hay que servir `worker.min.js`, el wasm y `spa.traineddata` desde
   `public/`.

## 4. Cómo volver a comprobarlo

```sh
npm audit                    # 0 vulnerabilidades
npm run lint                 # sin errores
npm run typecheck            # sin errores
npm test                     # 137 pruebas (incluye CSP y cachés)
curl -sI http://127.0.0.1:8080/ | grep -iE 'content-security|x-frame|permissions|cross-origin'
```

## 5. Reportar un problema

Si encuentras una vulnerabilidad, escribe a **privacidad@mialacena.app** con el
detalle y los pasos para reproducirla. No publiques datos de terceros. Se
responde en español y se avisa aquí cuando el arreglo esté publicado.
