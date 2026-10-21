# APIs públicas sin llave y código abierto reutilizado

mialacena refuerza sus funciones de siempre con servicios públicos **sin key,
sin registro y sin cuenta**. Principios:

- Cada llamada es iniciada por la persona (escanear, buscar recetas, «Buscar
  cerca de mí») salvo el aviso de feriado, que no envía ningún dato.
- Viaja el mínimo: un código de barras, un ingrediente en inglés o nada.
- Si un servicio no responde, la app sigue funcionando igual (la despensa es
  local; estas fichas son un extra). Todo parser tiene pruebas con respuestas
  reales recortadas de cada API.

El catálogo de referencia para elegirlas fue el repo público
[public-apis/public-apis](https://github.com/public-apis/public-apis).

## Servicios (HTTP, sin llave)

| Servicio | Para qué en mialacena | Qué se envía | Dónde vive el código |
|---|---|---|---|
| [Open Food Facts](https://world.openfoodfacts.org) — API v2 `GET /api/v2/product/{code}.json?fields=…` | Ficha completa al escanear/elegir un producto: foto, Nutri-Score, Eco-Score, NOVA, alérgenos en español, ingredientes, nutrimentos/100 g, presentación | Solo el código de barras | `src/lib/off.ts`, `src/lib/facts.functions.ts`, `src/lib/barcode.functions.ts`, `src/components/facts-panel.tsx` |
| [Open Prices](https://prices.openfoodfacts.org) — `GET /api/v1/prices?product_code=…` | «Ver precios públicos»: rango/mediana registrados por la comunidad. Referencia mundial con moneda y país; **nunca** se copia como MXN | Solo el código de barras | `src/lib/open-prices.ts`, `src/lib/prices.functions.ts` |
| [TheMealDB](https://www.themealdb.com/api.php) — `filter.php?i=` + `lookup.php?i=` | «Cocina con tu despensa»: recetas a partir de lo que sí hay, empezando por lo que caduca pronto; los faltantes pasan a la lista | Un ingrediente en inglés (`egg`, `milk`…) | `src/lib/recipes.ts`, `src/lib/recipes.functions.ts`, `src/components/recipes-card.tsx` |
| [Nager.Date](https://date.nager.at) — `GET /api/v3/NextPublicHolidays/MX` | Aviso en Hoy si hay feriado en México en ≤10 días, para adelantar la compra | Nada | `src/lib/holidays.functions.ts`, `src/components/holiday-note.tsx` |
| [OpenStreetMap · Overpass](https://overpass-api.de) — Overpass QL `shop=supermarket/convenience… (around:2000)` | «Tiendas cercanas» en la Lista: súpers en 2 km con distancia y «Cómo llegar» | La ubicación, **directo del teléfono a OpenStreetMap** con permiso del sistema; no pasa por el servidor de la app ni se guarda | `src/lib/stores.ts`, `src/components/stores-card.tsx` |

Las llamadas de servidor comparten `src/lib/public-fetch.ts` (timeout, caché
con TTL y `User-Agent` identificable, mismo patrón que ya usaba el catálogo).

## Repos públicos de GitHub reutilizados (npm, carga bajo demanda)

| Repo | Paquete | Qué refuerza |
|---|---|---|
| [ZXingJS](https://github.com/zxing-js/library) | `@zxing/browser` + `@zxing/library` | Lectura de códigos de barras donde no hay `BarcodeDetector` nativo (Safari/Firefox): foto y cámara en vivo, todo en el teléfono. Ver `src/lib/barcode-detector.ts`. |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | `tesseract.js` | OCR local de tickets en español cuando la lectura por IA (xAI) no está configurada: la foto no sale del dispositivo y el texto alimenta el parser de tickets existente. Ver `src/lib/ticket-ocr.ts` y `src/components/ticket-modal.tsx`. |

Ambos se cargan con `import()` dinámico: no pesan en la carga inicial y solo
bajan cuando la persona escanea un código o sube un ticket.

## Licencias y atribución

- **Open Food Facts / Open Prices**: bases de datos bajo
  [ODbL](https://opendatacommons.org/licenses/odbl/); se atribuyen en la UI
  («Ficha pública · Open Food Facts», «Open Prices») y cada ficha enlaza a la
  página del producto para ver/corregir. Las fotos de productos son de sus
  colaboradores (CC BY-SA).
- **OpenStreetMap**: © colaboradores de OpenStreetMap (ODbL); atribuido en la
  tarjeta de tiendas.
- **TheMealDB**: API gratuita de uso abierto; las recetas enlazan a su página.
- **Nager.Date**: servicio público gratuito.
- **ZXing** (Apache-2.0) y **Tesseract.js** (Apache-2.0): se usan como
  dependencias npm sin modificar su código.
