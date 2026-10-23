# mialacena

Despensa personal para el teléfono. Configuras lo que debe haber (con marca), tomas fotos o un video, y la app te dice qué falta. La lista lleva cantidad, precio y total. Puedes guardar cada compra, finalizarla y descargar un Excel.

Los datos se quedan en el teléfono. Las fotos solo se envían al pulsar el análisis y no se almacenan.

**Respaldo.** Desde Hoy, «Guardar respaldo» descarga un archivo con la despensa, las listas y la última lectura; «Cargar respaldo» lo lee en otro teléfono y reemplaza lo que haya ahí. El archivo se arma en el teléfono: no pasa por ningún servidor.

**Datos públicos sin cuenta.** Al escanear un código, la familia Open \* Facts trae la ficha del producto (Nutri-Score, alérgenos, ingredientes, foto): Open Food Facts para alimentos, Open Beauty Facts para higiene y Open Products Facts para limpieza. Open Prices enseña precios de referencia de la comunidad —con equivalencia aproximada en pesos vía Frankfurter— sin copiarlos nunca como MXN. «Cocina con tu despensa» sugiere recetas de TheMealDB con lo que sí hay —empezando por lo que caduca pronto— y pasa los faltantes a la lista; si ese servicio no responde, pide ideas al lector de IA y las marca como sugeridas. La Lista puede buscar súpers cercanos en OpenStreetMap (con el nombre de la colonia) y Hoy avisa de feriados próximos en México (Nager.Date) para adelantar la compra. Nada de esto pide llave ni registro; el detalle y las atribuciones están en [docs/APIS-PUBLICAS.md](docs/APIS-PUBLICAS.md). La lectura de códigos sin detector nativo (ZXing) y el OCR de tickets (Tesseract.js) corren en el propio teléfono.

**Privacidad y seguridad.** El [aviso de privacidad](src/components/view-privacidad.tsx) explica qué se queda en el teléfono, qué sale y cuándo; también está en la app (Privacidad) y en `/privacidad`. Las medidas técnicas y los riesgos residuales están en [docs/SEGURIDAD.md](docs/SEGURIDAD.md), y el análisis de índices de la base de datos en [docs/BASE-DE-DATOS.md](docs/BASE-DE-DATOS.md).

**Al finalizar, ya está en casa.** Lo que marcaste como «Ya lo llevo» cuenta como repuesto en la despensa al finalizar la compra, hasta el próximo escaneo (con foto o a mano), que es el que vuelve a decir qué hay.
