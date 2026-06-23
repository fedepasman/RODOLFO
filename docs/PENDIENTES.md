# Mejoras Pendientes — Sistema de Seguimiento de Licitaciones

Backlog priorizado. Actualizar cuando se complete o descarte un ítem.

---

## 🔴 Crítico (afecta eficiencia diaria)

### 1. `Filtrar Nuevas` no filtra — reprocesa todo cada día
**Problema:** `$env.SUPABASE_SERVICE_ROLE_KEY` devuelve vacío en el task runner de n8n 2.x.
El nodo tiene un guard `if(supaKey)` que silenciosamente salta la consulta a Supabase cuando
la clave está vacía → trata los 304+ ítems como nuevos en cada run → el sub-workflow scrapea
y hace upsert de todo cada vez (~40 minutos diarios en lugar de ~5 min solo con los nuevos).

**Fix rápido (ya aplicado en sub-workflow):** agregar la clave hardcodeada como fallback en el Code node de `Filtrar Nuevas`, igual que en `Scraper Puppeteer`:
```javascript
const supaKey = $env.SUPABASE_SERVICE_KEY
  || $env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // service_role key
```

**Fix correcto (Easypanel):** en el container de n8n, agregar env var:
```
N8N_RUNNERS_ALLOWED_ENV_VARS=SUPABASE_SERVICE_ROLE_KEY,SUPABASE_ANON_KEY
```
Una vez que funcione `$env`, quitar las claves hardcodeadas de todos los Code nodes.

---

### 2. Configurar `N8N_RUNNERS_ALLOWED_ENV_VARS` en Easypanel
**Problema:** n8n 2.x ejecuta Code nodes en un proceso separado (task runner) que no hereda
los env vars del proceso principal por razones de seguridad. Hay que allowlistarlos explícitamente.

**Fix:** En Easypanel → servicio n8n → Environment Variables, agregar:
```
N8N_RUNNERS_ALLOWED_ENV_VARS=SUPABASE_SERVICE_ROLE_KEY,SUPABASE_ANON_KEY
```
Reiniciar el container. Verificar con un Code node de prueba: `return [{ json: { key: $env.SUPABASE_SERVICE_ROLE_KEY?.slice(0,10) } }]`

Una vez confirmado, remover las claves hardcodeadas de:
- `Scraper Puppeteer` (sub-workflow `R9G73Kw8YIDs4sQa`)
- `Filtrar Nuevas` (main workflow `srvQpSkNQMS80ZbA`) — cuando se aplique el fix rápido

---

## 🟡 Importante (mejora robustez)

### 3. Investigar 5 licitaciones faltantes del primer run
Primera corrida completa guardó 299/304. Un batch de 5 items falló silenciosamente
(`onError: continueRegularOutput` lo tragó). Los 5 se recuperarán en el próximo run automáticamente,
pero conviene identificar cuáles son y por qué fallaron.

**Cómo investigar:**
```sql
-- En Supabase: buscar las que tendrían que estar pero no están
-- Comparar contra el Excel del día anterior
SELECT numero, url_detalle, modalidad FROM licitaciones
WHERE portal = 'nacional' AND url_detalle IS NULL;
```

### 4. Verificar que los archivos locales de workflow estén siempre sincronizados
El live workflow en n8n es la fuente de verdad. Los JSON locales en `n8n/workflows/` son solo
referencia y backup. Después de cualquier cambio en n8n, exportar:
```bash
# Main workflow
curl -s https://n8n.betoviedo.com/api/v1/workflows/srvQpSkNQMS80ZbA \
  -H "X-N8N-API-KEY: <KEY>" | jq > n8n/workflows/comprar-importacion-diaria.json

# Sub-workflow
curl -s https://n8n.betoviedo.com/api/v1/workflows/R9G73Kw8YIDs4sQa \
  -H "X-N8N-API-KEY: <KEY>" | jq > n8n/workflows/comprar-scraper-subworkflow.json
```

---

## 🔵 Fase 2

### 5. Activar BAC CABA workflow
`n8n/workflows/bac-caba-importacion-diaria.json` existe pero está `active: false`.
Antes de activar: verificar que el scraping de BAC funcione (ASP.NET con cookies y ViewState).
Ver `memory/bac-caba-scraping-headless.md` para contexto del approach con Chromium.

### 6. Implementar PBAC Provincia de Buenos Aires
No hay workflow todavía. Requiere investigar la API/web de PBAC.

### 7. Email de notificación diaria
Alternativa o complemento al Telegram. El spec menciona SendGrid o similar.

### 8. Config UI con pesos de ponderación ajustables
La tabla `configuracion` en Supabase ya existe con los pesos (rubro 50, participación 20,
monto 15, días 15). La UI de configuración aún no está implementada (Fase 2 del spec).

### 9. AGENTS.md
El archivo raíz `AGENTS.md` es un stub sin contenido real. Completar o eliminar.
