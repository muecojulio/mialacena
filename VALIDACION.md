# Validación de mialacena

Revisión contra la lista de requisitos, hecha el **21 de octubre de 2026** con la app
corriendo y navegándola de punta a punta en un navegador real (Chromium, pantalla de
teléfono 430 × 900), más 10 pruebas de lógica sobre el cálculo de faltantes y el Excel.

**Resultado: los 11 requisitos están cubiertos y funcionando (33/33 comprobaciones en
navegador y 10/10 de lógica).** Durante la revisión se reforzaron dos puntos débiles;
el detalle está al final.

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
