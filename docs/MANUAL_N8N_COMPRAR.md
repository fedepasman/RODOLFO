# Manual del Sistema — Importación Diaria ComprAR

Estado: **funcionando en producción** (primer run completo: 22/06/2026, 299/304 licitaciones con detalle completo).

---

## Qué hace

Cada día hábil a las 8:00 AM (Buenos Aires):
1. Descarga el listado de licitaciones vigentes de [ComprAR Nacional](https://comprar.gob.ar) en formato Excel.
2. Parsea y calcula un score de relevancia (0–100) para cada licitación según rubro, monto, días al cierre y participación previa.
3. Detecta cuáles son nuevas (no están en Supabase).
4. Para cada nueva, navega con Puppeteer al detalle en `comprar.gob.ar` y extrae: URL real, modalidad, tipo de procedimiento, cronograma (publicación/apertura), y renglones de compra.
5. Hace upsert de todo en Supabase.
6. Envía resumen por Telegram.

---

## Arquitectura

```
[Cron 8:00 AM BsAs]
        │
        ▼
[Preparar Fechas]  ← lee rubros de Supabase
        │
        ▼
[Descargar Excel ComprAR]  ← Puppeteer spawn, POST form, base64
        │
        ▼
[Parsear Excel]  ← SpreadsheetFile node
        │
        ▼
[Mapear y Calcular Score]  ← normaliza, score 0-100, filtra vencidas
        │
        ▼
[Filtrar Nuevas]  ← dedup contra Supabase (⚠️ ver PENDIENTES #1)
        │
        ▼
[Preparar Filas]  ← array → items individuales
        │
        ▼
[Loop Over Items] ──────────────────────────────────────┐
   (splitInBatches, 5 items/batch)                       │
        │ port 1 (loop)                                  │ loop back
        ▼                                                │
[Scraper Sub-workflow] ──────────────────────────────────┘
   (executeWorkflow → R9G73Kw8YIDs4sQa)
        │
        │ port 0 (done, cuando no quedan más batches)
        ▼
[Construir Mensaje]
        │
        ▼
[Notificación Telegram]
```

**Por qué existe el sub-workflow:** n8n 2.x ejecuta Code nodes en un task runner con timeout
`N8N_RUNNERS_TASK_TIMEOUT=1800s`. Con 304 licitaciones × ~8s cada una = ~40 min, se superaba
el límite y el proceso moría a mitad. El nodo `executeWorkflow` corre en el proceso principal
de n8n (sin ese límite). Cada batch de 5 items tiene su propia ejecución del sub-workflow con
un timer fresco de 1800s (5 × 8s = 40s << 1800s ✅).

---

## Instancia n8n

| Campo | Valor |
|---|---|
| URL | https://n8n.betoviedo.com |
| Versión | 2.56.1 |
| Hosting | Self-hosted en Easypanel |
| API Key | Ver `/Users/fedepasman/.claude/mcp.json` (no versionar) |
| ID main workflow | `srvQpSkNQMS80ZbA` |
| ID sub-workflow | `R9G73Kw8YIDs4sQa` |

> **Fuente de verdad:** siempre el workflow live en n8n. Los JSON locales en `n8n/workflows/`
> son backup y referencia. NUNCA importar el JSON local sobre el live sin revisar.

---

## Main Workflow — Nodos

### 1. Cron Diario
- Tipo: `n8n-nodes-base.scheduleTrigger` (typeVersion 1.2)
- Expresión: `0 11 * * 1-5` (UTC) = 8:00 AM hora Buenos Aires (UTC-3)
- Solo días hábiles (lunes a viernes)

### 2. Preparar Fechas
- Tipo: Code (typeVersion 2, runOnceForAllItems)
- Calcula `fechaHoyISO` y `fechaHoyDisplay`
- Intenta leer rubros activos de Supabase (`/rest/v1/rubros?activo=eq.true`) con `$env.SUPABASE_ANON_KEY`
- Si falla (key vacía o error), usa rubros hardcodeados: informática, ferretería, indumentaria, EPP, bazar, mantenimiento

### 3. Descargar Excel ComprAR
- Tipo: Code (typeVersion 2) con `onError: continueRegularOutput`
- Lanza un proceso hijo con Puppeteer (spawn `node -e SCRAPER`)
- Navega a `https://comprar.gob.ar/Compras.aspx?qs=W1HXHGHtH10=`
- Extrae ViewState/CSRF del form y hace POST para disparar la descarga del Excel
- Retorna el Excel como binario base64 en `$json.binary.data`
- Chromium: `/usr/bin/chromium-browser`; Puppeteer: `/usr/local/lib/node_modules/puppeteer`

### 4. Parsear Excel
- Tipo: `n8n-nodes-base.spreadsheetFile` (typeVersion 1)
- Lee el binario del nodo anterior, retorna una fila JSON por licitación

### 5. Mapear y Calcular Score
- Tipo: Code (typeVersion 2, runOnceForAllItems)
- Detecta columnas del Excel por nombre (insensible a mayúsculas/tildes)
- Calcula score 0–100:
  - **Rubro** (50 pts): match de keywords en el título
  - **Monto** (15 pts): escala por umbrales ($500K / $1M / $5M)
  - **Días al cierre** (15 pts): escala por urgencia (≤3 / ≤7 / ≤15 días)
  - **Participación previa** (20 pts): campo `participacion_previa` (siempre `false` hasta Fase 2)
- Prioridad: `alta` ≥70, `media` ≥40, `baja` <40
- Filtra licitaciones ya vencidas (`diasAlCierre < 0`)
- Decodifica entidades HTML en títulos (ej. `&#233;` → `é`)

### 6. Filtrar Nuevas
- Tipo: Code (typeVersion 2, runOnceForAllItems)
- ⚠️ **BUG CONOCIDO**: `$env.SUPABASE_SERVICE_KEY` vacío → skip silencioso → trata todo como nuevo
- Ver `PENDIENTES.md` ítem #1 y #2 para el fix
- Cuando funcione: query `GET /rest/v1/licitaciones?portal=eq.nacional&select=numero&limit=5000`
  y filtra los `numero` ya presentes

### 7. Preparar Filas
- Tipo: Code (typeVersion 2, runOnceForAllItems)
- Explota el array de licitaciones en items individuales para el Loop

### 8. Loop Over Items
- Tipo: `n8n-nodes-base.splitInBatches` (typeVersion 3, batchSize=5)
- ⚠️ **QUIRK CRÍTICO** (typeVersion 3): los puertos están invertidos respecto a versiones anteriores:
  - **Port 0 = done** (señal de fin del loop) → conectado a `Construir Mensaje`
  - **Port 1 = loop** (batch actual) → conectado a `Scraper Sub-workflow`
- En typeVersion 1 y 2 era al revés (port 0 = loop, port 1 = done)

### 9. Scraper Sub-workflow
- Tipo: `n8n-nodes-base.executeWorkflow` (typeVersion 1.2)
- `source: database`, `workflowId` en formato resource locator: `{"__rl": true, "value": "R9G73Kw8YIDs4sQa", "mode": "id"}`
- `onError: continueRegularOutput` — si un batch falla, el loop continúa con el siguiente
- Output conectado de vuelta a `Loop Over Items` (input 0) para el siguiente batch

### 10. Construir Mensaje
- Tipo: Code (typeVersion 2)
- Lee stats de `Filtrar Nuevas` via `$('Filtrar Nuevas').first().json`
- Arma texto Markdown para Telegram con conteo de alta/media/baja prioridad

### 11. Notificación Telegram
- Tipo: `n8n-nodes-base.telegram` (typeVersion 1.2)
- Chat ID: `177682377`
- Credencial: `RodolfiBOT` (ID `Q57U4xrqkMkjOLSL`)
- Parse mode: Markdown

---

## Sub-workflow — Scraper Detalles ComprAR

**ID:** `R9G73Kw8YIDs4sQa`  
**Nombre:** Scraper - Detalles ComprAR (Sub-workflow)

### Nodo 1: Recibir Items
- Tipo: `n8n-nodes-base.executeWorkflowTrigger` (**typeVersion 1**)
- ⚠️ Debe ser typeVersion 1, NO 1.1. La versión 1.1 requiere configurar `workflowInputs` o no se puede publicar el workflow.
- No tiene parámetros — simplemente recibe los items del workflow padre via `$input.all()`

### Nodo 2: Scraper Puppeteer
- Tipo: Code (typeVersion 2) con `onError: continueRegularOutput`
- Lee la clave de Supabase: `$env.SUPABASE_SERVICE_KEY || $env.SUPABASE_SERVICE_ROLE_KEY || '<clave_hardcodeada>'`
- Lanza un proceso hijo (spawn `node -e SCRAPER`) que:
  1. Abre Chromium con Puppeteer
  2. Para cada item del batch (máx 5):
     - Navega a `https://comprar.gob.ar/BuscarAvanzado.aspx`
     - Tipea el número de expediente en `#ctl00_CPH1_txtNumeroProceso`
     - Hace click en "Buscar" y espera el link `a[id*="lnkNumeroProceso"]` (timeout 12s)
     - Navega al detalle y extrae:
       - `url_detalle`: URL actual de la página
       - `modalidad`: `ctl00_CPH1_UCVistaPreviaPliego_UC_InformacionBasica_lblModalidad`
       - `tipo_procedimiento`: `..._lblProcedimientoSeleccion`
       - `cronograma_detalle`: objeto con `publicacion` y `apertura`
       - `renglones`: tabla `UC_DetalleProductos_gvLineaPliego` parseada con regex
     - Si no encuentra el link: guarda el item con `_err: 1` (sin detalle, sigue al siguiente)
  3. Cierra Chromium
  4. Hace upsert en Supabase: `POST /rest/v1/licitaciones?on_conflict=portal,numero`
     con `Prefer: resolution=merge-duplicates,return=minimal`
  5. Retorna `{ ok, supaStatus, supaBody, items }` por stdout
- El Code node parsea el stdout y retorna `{ items, totalItems, supaStatus, supaBody }`

---

## Variables y Credenciales

| Variable / Credencial | Dónde se usa | Estado actual |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Sub-workflow: save en Supabase | Hardcodeada como fallback en Code node |
| `SUPABASE_SERVICE_KEY` | Filtrar Nuevas: dedup | `$env` vacío → bug, ver PENDIENTES #1 |
| `SUPABASE_ANON_KEY` | Preparar Fechas: leer rubros | `$env` vacío → usa rubros hardcodeados |
| `RodolfiBOT` | Telegram | Credencial n8n ID `Q57U4xrqkMkjOLSL` |
| Supabase URL | Todos los Code nodes | Hardcodeada: `https://azwplnjlkfcszbrfaehv.supabase.co` |
| Chromium | Sub-workflow: Puppeteer | `/usr/bin/chromium-browser` (en el container de n8n) |
| Puppeteer | Sub-workflow | `/usr/local/lib/node_modules/puppeteer` (en el container) |

---

## Supabase

- **Proyecto:** `azwplnjlkfcszbrfaehv` (supabase.co)
- **Tabla:** `licitaciones`
- **Unique constraint:** `(portal, numero)` — usado para upsert
- **Columnas de detalle** (migración v2 en `lib/supabase/schema.sql`):
  - `url_detalle TEXT`
  - `modalidad TEXT`
  - `tipo_procedimiento TEXT`
  - `cronograma_detalle JSONB`
  - `renglones JSONB`
- Schema completo: `lib/supabase/schema.sql`
- RLS policies: `lib/supabase/rls.sql`

---

## Cómo replicar en otra instancia n8n

### Requisitos previos
1. n8n self-hosted con Chromium y Puppeteer instalados en el container.
   - Chromium disponible en `/usr/bin/chromium-browser`
   - `npm install -g puppeteer` o similar para que esté en `/usr/local/lib/node_modules/puppeteer`
2. Proyecto Supabase con schema aplicado (`schema.sql` → `rls.sql` → `seed.sql`).
3. Bot de Telegram creado (@BotFather) con el token configurado como credencial en n8n.

### Pasos
1. **Crear el sub-workflow primero** (debe estar publicado antes del main):
   - Importar `n8n/workflows/comprar-scraper-subworkflow.json` en n8n
   - Verificar que el trigger sea `executeWorkflowTrigger` typeVersion **1** (no 1.1)
   - Publicar y anotar el ID generado
   - Reemplazar la clave de Supabase hardcodeada en el Code node con la real

2. **Crear el main workflow**:
   - Importar `n8n/workflows/comprar-importacion-diaria.json`
   - En el nodo `Scraper Sub-workflow`, actualizar el `workflowId` con el ID del sub-workflow nuevo
   - Verificar que `Loop Over Items` (splitInBatches typeVersion 3) tenga:
     - Port 0 → `Construir Mensaje`
     - Port 1 → `Scraper Sub-workflow`
   - Configurar la credencial de Telegram (`RodolfiBOT`)
   - Activar el workflow

3. **Configurar env vars en n8n** (Easypanel u otro host):
   ```
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   SUPABASE_ANON_KEY=<anon_key>
   N8N_RUNNERS_ALLOWED_ENV_VARS=SUPABASE_SERVICE_ROLE_KEY,SUPABASE_ANON_KEY
   N8N_RUNNERS_TASK_TIMEOUT=1800
   ```

4. **Test manual**: ejecutar el main workflow desde n8n UI y monitorear ejecuciones del sub-workflow.

---

## Troubleshooting conocido

### `Loop Over Items` va directo a done sin pasar por el scraper
**Causa:** `splitInBatches` typeVersion 3 tiene los puertos invertidos vs versiones anteriores.
Port 0 = done, port 1 = loop. Si las conexiones están al revés, el scraper recibe 0 items y
el mensaje de fin va al nodo de Telegram.
**Fix:** verificar en el workflow que `Loop Over Items` port 0 → `Construir Mensaje` y port 1 → `Scraper Sub-workflow`.

### Sub-workflow no se ejecuta nunca (0 executions)
**Causa más común:** el workflow del sub-workflow no está publicado (estado Draft). Un `executeWorkflow`
solo puede llamar a workflows publicados (estado Published/active).
**Fix:** activar el sub-workflow con `POST /api/v1/workflows/{id}/activate`.

### Supabase devuelve 401 (No API key found)
**Causa:** `$env.SUPABASE_SERVICE_KEY` o `$env.SUPABASE_SERVICE_ROLE_KEY` están vacíos en el
task runner de n8n 2.x. La variable no está en `N8N_RUNNERS_ALLOWED_ENV_VARS`.
**Fix inmediato:** hardcodear la clave como fallback:
```javascript
const SUPA_KEY = $env.SUPABASE_SERVICE_KEY
  || $env.SUPABASE_SERVICE_ROLE_KEY
  || 'TU_SERVICE_ROLE_KEY_AQUI';
```
**Fix permanente:** configurar `N8N_RUNNERS_ALLOWED_ENV_VARS` en Easypanel (ver PENDIENTES #2).

### `executeWorkflowTrigger` no puede publicarse (configuration issue)
**Causa:** el trigger está en typeVersion 1.1, que requiere configurar `workflowInputs` con schema.
**Fix:** cambiar el trigger a typeVersion 1 (no requiere parámetros adicionales).
```bash
# Via API:
curl -X PUT https://n8n.host/api/v1/workflows/{ID} \
  -H "X-N8N-API-KEY: <KEY>" \
  -d '{"nodes": [...trigger_con_typeVersion_1...], ...}'
```

### La clave de Supabase no llega al proceso hijo (spawn)
El spawn crea un proceso completamente nuevo sin acceso a `$env` ni al scope del Code node.
La única forma de pasarle la clave es via stdin:
```javascript
proc.stdin.write(JSON.stringify({ items, supaKey: SUPA_KEY }));
```
Y leerla dentro del SCRAPER string:
```javascript
const supaKey = parsed.supaKey;
```

### n8n MCP `n8n_update_partial_workflow` no funciona
En esta instancia de n8n (2.56.1), el MCP devuelve `"request/body must NOT have additional properties"`
para todas las operaciones. Usar el REST API directo con curl + `PUT /api/v1/workflows/{id}` en su lugar.
Remover los campos read-only antes del PUT: `active`, `isArchived`, `activeVersionId`, `versionCounter`,
`triggerCount`, `id`, `createdAt`, `updatedAt`, `versionId`, `shared`, `meta`, `nodeGroups`,
`pinData`, `sourceWorkflowId`, `staticData`, `activeVersion`, `tags`.
