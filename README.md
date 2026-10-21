# mialacena

Despensa personal para el teléfono. Configuras lo que debe haber (con marca), tomas fotos o un video, y la app te dice qué falta. La lista lleva cantidad, precio y total. Puedes guardar cada compra, finalizarla y descargar un Excel.

Los datos se quedan en el teléfono. Las fotos solo se envían al pulsar el análisis y no se almacenan.

**Respaldo.** Desde Hoy, «Guardar respaldo» descarga un archivo con la despensa, las listas y la última lectura; «Cargar respaldo» lo lee en otro teléfono y reemplaza lo que haya ahí. El archivo se arma en el teléfono: no pasa por ningún servidor.

**Datos públicos sin cuenta.** Al escanear un código, Open Food Facts trae la ficha del producto (Nutri-Score, alérgenos, ingredientes, foto) y Open Prices enseña precios de referencia de la comunidad. «Cocina con tu despensa» sugiere recetas de TheMealDB con lo que sí hay —empezando por lo que caduca pronto— y pasa los faltantes a la lista. La Lista puede buscar súpers cercanos en OpenStreetMap, y Hoy avisa de feriados próximos en México (Nager.Date) para adelantar la compra. Nada de esto pide llave ni registro; el detalle y las atribuciones están en [docs/APIS-PUBLICAS.md](docs/APIS-PUBLICAS.md). La lectura de códigos sin detector nativo (ZXing) y el OCR de tickets (Tesseract.js) corren en el propio teléfono.

**Al finalizar, ya está en casa.** Lo que marcaste como «Ya lo llevo» cuenta como repuesto en la despensa al finalizar la compra, hasta el próximo escaneo (con foto o a mano), que es el que vuelve a decir qué hay.
