# APIs públicas sin llave y código abierto reutilizado

mialacena refuerza sus funciones de siempre con servicios públicos **sin key,
sin registro y sin cuenta**. Principios:

- Cada llamada es iniciada por la persona (escanear, buscar recetas, «Buscar
  cerca de mí») salvo el aviso de feriado, que no envía ningún dato.
- Viaja el mínimo: un código de barras, un ingrediente en inglés o nada.
- Si un servicio no responde, la app sigue funcionando igual (la despensa es
  local; estas fichas son un extra). Todo parser tiene pruebas con respuestas
  reales recortadas de cada API.
- Si un servicio público falla y hay una llave configurada, entra un respaldo
  (IA para recetas, tipo de cambio de respaldo); si no, se dice y no se inventa.

El catálogo de referencia para elegirlas fue el repo público
[public-apis/public-apis](https://github.com/public-apis/public-apis).

## Servicios (HTTP, sin llave)

| Servicio | Para qué en mialacena | Qué se envía | Dónde vive el código |
|---|---|---|---|
| **Familia Open \* Facts** — [Open Food Facts](https://world.openfoodfacts.org) (alimentos), [Open Beauty Facts](https://world.openbeautyfacts.org) (higiene y belleza) y [Open Products Facts](https://world.openproductsfacts.org) (limpieza y hogar). API v2 `GET /api/v2/product/{code}.json?fields=…` | Ficha completa al escanear/elegir un producto: foto, Nutri-Score, Eco-Score, NOVA, alérgenos en español, ingredientes, nutrimentos/100 g, presentación. La búsqueda va en cadena: si el primero no conoce el código, se pregunta al siguiente (cloro y jabón no están en Food Facts) | Solo el código de barras | `src/lib/off.ts`, `src/lib/product-sources.ts`, `src/lib/facts.functions.ts`, `src/lib/barcode.functions.ts`, `src/components/facts-panel.tsx` |
| [Open Beauty Facts · búsqueda](https://world.openbeautyfacts.org) — `cgi/search.pl?search_terms=…&json=1` | Respaldo del autocompletar de marcas cuando Open Food Facts no tiene resultados (productos de limpieza e higiene) | El texto que escribes (máx. 60 letras) | `src/lib/catalog.functions.ts`, `src/lib/product-sources.ts` |
| [Open Prices](https://prices.openfoodfacts.org) — `GET /api/v1/prices?product_code=…` | «Ver precios públicos»: rango/mediana registrados por la comunidad. Referencia mundial con moneda y país; **nunca** se copia como MXN | Solo el código de barras | `src/lib/open-prices.ts`, `src/lib/prices.functions.ts` |
| [Frankfurter](https://frankfurter.dev) — `GET /latest?from=EUR&to=MXN` (datos del Banco Central Europeo) | Equivalencia **aproximada en pesos** de los precios públicos que Open Prices da en otra moneda. Se muestra etiquetada como referencia y nunca se copia a la despensa | Solo la moneda (`EUR`, `USD`…) | `src/lib/fx.ts`, `src/lib/fx.functions.ts`, `src/components/facts-panel.tsx` |
| [TheMealDB](https://www.themealdb.com/api.php) — `filter.php?i=` + `lookup.php?i=` | «Cocina con tu despensa»: recetas a partir de lo que sí hay, empezando por lo que caduca pronto; los faltantes pasan a la lista | Un ingrediente en inglés (`egg`, `milk`…) | `src/lib/recipes.ts`, `src/lib/recipes.functions.ts`, `src/components/recipes-card.tsx` |
| [Respaldo con IA de las recetas](https://api.x.ai) — solo si `XAI_API_KEY` existe | Si TheMealDB no responde o no conoce el ingrediente, se piden ideas con los nombres de la despensa. La tarjeta lo marca como «sugerida por IA» | Nombres de productos de la despensa (máx. 24, sin precios ni cantidades) | `src/lib/recipes-ai.ts`, `src/lib/ai.server.ts` |
| [Nager.Date](https://date.nager.at) — `GET /api/v3/NextPublicHolidays/MX` | Aviso en Hoy si hay feriado en México en ≤10 días, para adelantar la compra | Nada | `src/lib/holidays.functions.ts`, `src/components/holiday-note.tsx` |
| [OpenStreetMap · Overpass](https://overpass-api.de) — Overpass QL `shop=supermarket/convenience… (around:2000)` | «Tiendas cercanas» en la Lista: súpers en 2 km con distancia y «Cómo llegar» | La ubicación, **directo del teléfono a OpenStreetMap** con permiso del sistema; no pasa por el servidor de la app ni se guarda | `src/lib/stores.ts`, `src/components/stores-card.tsx` |
| [OpenStreetMap · Nominatim](https://nominatim.openstreetmap.org) — `GET /reverse?format=jsonv2` | Ponerle nombre al lugar («Súpers cerca de Coyoacán») en vez de enseñar coordenadas. Una sola consulta por búsqueda, después de Overpass | La misma ubicación, también **directo del teléfono**; no se guarda | `src/lib/geo.ts`, `src/components/stores-card.tsx` |

Las llamadas de servidor comparten `src/lib/public-fetch.ts`: tiempo límite,
tope de tamaño de respuesta, `User-Agent` identificable que dice quién llama y
**una sola petición en vuelo por URL** (si dos personas escanean el mismo código
a la vez, ambas esperan la misma respuesta). Encima hay caché con TTL por tipo de
dato: ficha 6 h, precios públicos 1 h, tipo de cambio 6 h, recetas 30 min,
feriados 24 h, búsquedas 10 min y códigos desconocidos 10 min (caché negativa
para no castigar a los tres catálogos cada vez). En el navegador,
`src/lib/client-cache.ts` evita repetir la misma ficha al abrir y cerrar el
editor.

## Variables de entorno opcionales

Ninguna hace falta para usar la app; todas activan **extras** y solo se leen en
el servidor:

| Variable | Qué activa | Si no está |
|---|---|---|
| `XAI_API_KEY` | Lectura de fotos y tickets con IA; respaldo de recetas cuando TheMealDB falla | La app usa el OCR local (Tesseract.js) y el marcado manual; las recetas se quedan con el aviso de siempre |
| `FX_MXN_PER_USD` / `FX_MXN_PER_EUR` | Tipo de cambio de respaldo cuando Frankfurter no responde | Se muestra solo la moneda original del precio público |
| `DATABASE_URL` | Base de datos para el inicio de sesión opcional | Se usa PGLite local; la app no necesita sesión |

## Repos públicos de GitHub reutilizados (npm, carga bajo demanda)

| Repo | Paquete | Qué refuerza |
|---|---|---|
| [ZXingJS](https://github.com/zxing-js/library) | `@zxing/browser` + `@zxing/library` (fijados en 0.1.5 / 0.21.3, que soportan Node 22) | Lectura de códigos de barras donde no hay `BarcodeDetector` nativo (Safari/Firefox): foto y cámara en vivo, todo en el teléfono. Ver `src/lib/barcode-detector.ts`. |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | `tesseract.js` | OCR local de tickets en español cuando la lectura por IA (xAI) no está configurada: la foto no sale del dispositivo y el texto alimenta el parser de tickets existente. Ver `src/lib/ticket-ocr.ts` y `src/components/ticket-modal.tsx`. |
| [public-apis](https://github.com/public-apis/public-apis) | — | Catálogo de referencia para elegir los servicios sin llave de esta página. |
| [Open Food Facts](https://github.com/openfoodfacts/openfoodfacts-server) · [Open Prices](https://github.com/openfoodfacts/open-prices) | — | Servidores y documentación de la API v2 que se consume; también la fuente de los campos y sus licencias. |
| [Nager.Date](https://github.com/nager/Nager.Date) | — | Feriados públicos; su API v3 alimenta el aviso de Hoy. |
| [Frankfurter](https://github.com/lineofflight/frankfurter) | — | Tipo de cambio del BCE que se usa para la referencia en pesos. |

Ambos se cargan con `import()` dinámico: no pesan en la carga inicial y solo
bajan cuando la persona escanea un código o sube un ticket.

## Licencias y atribución

- **Open Food Facts / Open Beauty Facts / Open Products Facts / Open Prices**: bases de datos bajo
  [ODbL](https://opendatacommons.org/licenses/odbl/); se atribuyen en la UI
  («Ficha pública · Open Food Facts», «Open Prices») y cada ficha enlaza a la
  página del producto para ver/corregir. Las fotos de productos son de sus
  colaboradores (CC BY-SA).
- **Frankfurter**: datos del Banco Central Europeo, uso libre; en la interfaz se
  aclara que la equivalencia en pesos es orientativa.
- **OpenStreetMap / Nominatim**: © colaboradores de OpenStreetMap (ODbL);
  atribuido en la tarjeta de tiendas. Nominatim se consulta una vez por búsqueda,
  respetando su política de uso.
- **TheMealDB**: API gratuita de uso abierto; las recetas enlazan a su página.
- **Nager.Date**: servicio público gratuito.
- **ZXing** (Apache-2.0) y **Tesseract.js** (Apache-2.0): se usan como
  dependencias npm sin modificar su código.
