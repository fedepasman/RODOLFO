# Directiva: Paginación y Obtención de URLs de Detalle en ComprAR (SOP)

## Objetivo
Optimizar el flujo de scraping de ComprAR en n8n para obtener la información de detalle (renglones, proveedores, cronograma) de todas las licitaciones relevantes filtradas. Debido a que ASP.NET en ComprAR ignora los parámetros GET de búsqueda por fecha y siempre muestra solo la primera página de resultados predeterminada, no podemos confiar únicamente en el scraping inicial de URLs. 

En lugar de iterar por las 46 páginas en Puppeteer (lo cual demoraría >10 minutos y causaría timeout en n8n), la solución óptima es:
1. Descargar el archivo Excel consolidado mediante una solicitud HTTP POST (muy rápido, contiene todos los procesos de la fecha).
2. Filtrar y calcular el score de relevancia de las licitaciones en memoria.
3. Para aquellas que califiquen como relevantes (generalmente de 1 a 5), buscar su URL de detalle usando Puppeteer individualmente en `BuscarAvanzado.aspx` por su Número de Proceso único, o usar el `urlMap` de la página 1 si ya estaba disponible.

## Entradas
- URL de búsqueda de ComprAR: `https://comprar.gob.ar/Compras.aspx?qs=W1HXHGHtH10=`
- URL de búsqueda avanzada: `https://comprar.gob.ar/BuscarAvanzado.aspx`

## Pasos de Ejecución

### 1. Extracción Inicial del ViewState y Primeras URLs
- Realizar GET inicial a `https://comprar.gob.ar/Compras.aspx?qs=W1HXHGHtH10=`.
- Extraer `__VIEWSTATE`, `__EVENTVALIDATION`, `__VIEWSTATEGENERATOR` y el target del Excel.
- Extraer las URLs del mapa inicial de la página 1 (`urlMap`) para usarlas como caché rápido.

### 2. Descarga del Excel e Identificación de Candidatos
- Ejecutar la descarga del Excel con POST.
- Leer y procesar las filas del Excel.
- Filtrar por rubros y calcular el score. Solo los candidatos calificados continúan.

### 3. Obtención de Detalle Enriquecido vía Puppeteer
Para cada licitación relevante filtrada:
1. Verificar si ya existe su URL en el `urlMap` extraído de la página 1.
2. Si existe, navegar directamente a la URL de detalle.
3. Si no existe en el mapa (porque estaba en páginas 2-46):
   - Navegar a `https://comprar.gob.ar/BuscarAvanzado.aspx`.
   - Escribir el número de proceso único en el input `#ctl00_CPH1_txtNumeroProceso`.
   - Hacer clic en el botón de búsqueda por número `#ctl00_CPH1_btnListarPliegoNumero` y esperar a que el control AJAX de ASP.NET actualice la tabla `#ctl00_CPH1_GridListaPliegos`.
   - Encontrar el primer enlace de número de proceso en la tabla (ID que contenga `lnkNumeroProceso`).
   - Hacer un clic nativo de Puppeteer en el enlace para ejecutar el PostBack en la misma pestaña y navegar al detalle.
   - Extraer la URL de detalle final (`page.url()`) y toda la información de la licitación (expediente, procedimiento, modalidad, cronograma, renglones, proveedores).

## Restricciones y Casos Borde Conocidos
- **AJAX de ASP.NET**: No se puede esperar a la navegación normal (`waitForNavigation`) tras la búsqueda por número, ya que se realiza mediante AJAX/UpdatePanel. Debemos esperar a que aparezca la tabla `#ctl00_CPH1_GridListaPliegos`.
- **Cierre del navegador**: Cerrar el navegador en la cláusula `finally` para evitar fugas de memoria y procesos zombies en Docker.
- **PostBack dinámico**: No usar `window.eval` o `window.location` con código JavaScript para simular el click de postback, ya que puede disparar excepciones de Strict Mode de V8 (`arguments.caller.callee`). Hacer click nativo con `page.click()` sobre el elemento.
