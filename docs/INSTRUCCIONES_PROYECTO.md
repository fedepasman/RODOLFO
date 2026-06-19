# Sistema de Seguimiento de Licitaciones — Instrucciones del Proyecto

## Visión General

Sistema para búsqueda automática, ponderación y seguimiento de licitaciones públicas en los portales nacionales y de la provincia/ciudad de Buenos Aires. Combina automatización con n8n, almacenamiento en Supabase, y una webapp en Next.js para visualización y gestión.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Automatización | n8n (self-hosted) |
| Frontend | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Lucide React |
| Base de datos / Auth / Storage | Supabase |
| Deploy | Vercel |
| Repositorio | GitHub |
| Almacenamiento de archivos | Google Drive |
| Notificaciones | Telegram + Email |

---

## Portales a Monitorear

| Portal | URL | Jurisdicción |
|---|---|---|
| ComprAR | https://comprar.gob.ar/ | Nacional |
| Buenos Aires Compras | https://www.buenosairescompras.gob.ar | Ciudad de Buenos Aires |
| PBAC | https://pbac.cgp.gba.gov.ar | Provincia de Buenos Aires |

---

## Rubros de Interés

1. Informática y tecnología
2. Ferretería y herramientas
3. Indumentaria y calzado
4. EPP (Elementos de Protección Personal)
5. Bazar y vajilla

CUIT del proveedor: `20-29950091-9`

---

## Módulo 1 — Automatización con n8n

### Objetivo
Ejecutar una vez por día (días hábiles, 08:00 hs) un workflow que recorra los tres portales, extraiga licitaciones nuevas, las pondere y las almacene en Supabase.

### Flujo General del Workflow

```
[Trigger diario]
    → [Scraping / API Portal Nacional]
    → [Scraping / API Portal CABA]
    → [Scraping / API Portal PBA]
    → [Deduplicación contra Supabase]
    → [Ponderación automática]
    → [Guardado en Supabase]
    → [Notificación Telegram + Email]
```

### Lógica de Ponderación

Cada licitación recibe un **puntaje del 1 al 100** basado en los siguientes criterios:

| Criterio | Peso | Descripción |
|---|---|---|
| Coincidencia de rubro | 50 pts | Exacta: 50 / Parcial: 25 / Sin match: 0 |
| Participación previa con el organismo | 20 pts | Sí: 20 / No: 0 |
| Monto estimado | 15 pts | >$5M: 15 / $1M-$5M: 10 / <$1M: 5 / Sin dato: 0 |
| Días hasta cierre | 15 pts | >15 días: 15 / 7-15 días: 8 / <7 días: 3 |

**Categorías resultantes:**
- 🟢 Alta prioridad: 70–100 pts
- 🟡 Media prioridad: 40–69 pts
- 🔴 Baja prioridad: 0–39 pts

> Los pesos son configurables desde la webapp en una pantalla de configuración (Fase 2).

### Notificaciones

**Telegram:**
- Bot dedicado al sistema
- Mensaje diario con resumen: cantidad de licitaciones nuevas por portal y por prioridad
- Enlace directo a la webapp para ver el detalle

**Email:**
- Resumen diario en formato HTML
- Tabla con las licitaciones de alta prioridad del día
- Enviado desde una cuenta de Gmail configurada en n8n

---

## Módulo 2 — Base de Datos (Supabase)

> El schema, RLS y seed implementados viven en `lib/supabase/` (`schema.sql`,
> `rls.sql`, `seed.sql`). Esta sección es la especificación original.

### Tablas Principales

#### `licitaciones`
```sql
id              uuid PRIMARY KEY
portal          text  -- 'nacional' | 'caba' | 'pba'
numero          text  -- número de expediente/licitación
titulo          text
organismo       text
rubro           text
monto_estimado  numeric
fecha_publicacion date
fecha_cierre    date
url             text
estado          text  -- 'nueva' | 'seguimiento' | 'presentada' | 'descartada'
score           integer
prioridad       text  -- 'alta' | 'media' | 'baja'
participacion_previa boolean
created_at      timestamptz
```

#### `seguimientos`
```sql
id              uuid PRIMARY KEY
licitacion_id   uuid REFERENCES licitaciones(id)
user_id         uuid REFERENCES auth.users(id)
nota            text
archivo_drive   text  -- link a Google Drive
updated_at      timestamptz
```

#### `organismos_previos`
```sql
id              uuid PRIMARY KEY
nombre          text
cuit_organismo  text
participamos    boolean
resultado       text  -- 'ganada' | 'perdida' | 'desierta'
```

#### `configuracion`
```sql
id              uuid PRIMARY KEY
peso_rubro      integer  default 50
peso_participacion integer default 20
peso_monto      integer  default 15
peso_dias       integer  default 15
rubros_activos  text[]
updated_at      timestamptz
```

### Autenticación
- Supabase Auth con email/password
- Dos usuarios iniciales con rol `admin`
- Row Level Security (RLS) habilitado

---

## Módulo 3 — Webapp (Next.js)

### Estructura de Páginas

```
/                     → Redirige a /dashboard
/login                → Pantalla de login
/dashboard            → Vista principal con KPIs y licitaciones del día
/licitaciones         → Listado completo con filtros
/licitaciones/[id]    → Detalle de una licitación
/seguimiento          → Licitaciones marcadas en seguimiento
/configuracion        → Parámetros de ponderación y rubros (Fase 2)
```

### Dashboard — Componentes

- **KPI Cards:** Total licitaciones hoy / Alta prioridad / En seguimiento / Presentadas
- **Tabla principal:** Listado del día ordenado por score descendente
- **Filtros:** Por portal, por prioridad, por rubro, por estado
- **Badge de prioridad** con color (🟢 🟡 🔴)
- **Botón "Ver detalle":** Abre la página de la licitación con toda la info y link al portal original

### Vista de Detalle `/licitaciones/[id]`

- Datos completos de la licitación
- Link externo al portal original
- Campo para cambiar estado (nueva → seguimiento → presentada → descartada)
- Sección de notas
- Link a Google Drive para adjuntar archivos
- Historial de cambios de estado

---

## Estructura de Carpetas del Repositorio

```
/
├── app/
│   ├── (auth)/login/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── licitaciones/
│   │   │   └── [id]/
│   │   ├── seguimiento/
│   │   └── configuracion/
├── components/
│   ├── ui/              ← shadcn/ui
│   ├── licitaciones/    ← componentes específicos
│   ├── layout/
│   └── shared/
├── lib/
│   ├── supabase/        ← clientes + schema/rls/seed SQL
│   ├── actions/         ← server actions
│   ├── validations/     ← Zod schemas
│   └── utils.ts
├── types/
│   ├── database.ts      ← tipos generados de Supabase
│   └── licitaciones.ts
├── n8n/
│   └── workflows/       ← JSON exportados de n8n
└── docs/
    └── INSTRUCCIONES_PROYECTO.md
```

---

## Fases de Desarrollo

### Fase 1 — MVP (Prioridad inmediata)
- [x] Setup del repositorio y stack (Next.js + Supabase + Vercel)
- [x] Schema de base de datos en Supabase
- [ ] Workflow n8n: scraping Portal Nacional (ComprAR)
- [ ] Lógica de ponderación en n8n
- [ ] Dashboard básico con tabla de licitaciones
- [ ] Vista de detalle con cambio de estado
- [ ] Notificación por Telegram

### Fase 2 — Completar cobertura y UI
- [ ] Workflows n8n: portales CABA y PBA
- [ ] Notificación por email
- [ ] Pantalla de configuración de ponderación
- [ ] Filtros avanzados en el listado
- [ ] Integración Google Drive para adjuntos

### Fase 3 — Mejoras e inteligencia
- [ ] Registro de organismos con participación previa
- [ ] Estadísticas históricas (% por rubro, por portal, por resultado)
- [ ] Módulo de análisis: comparar licitaciones similares
- [ ] Exportación a PDF/Excel del listado filtrado

---

## Consideraciones Técnicas

- Los tres portales tienen APIs públicas o estructuras scrapeables. Antes de implementar, verificar si ComprAR expone API REST (tienen documentación pública en api.comprar.gob.ar).
- n8n debe correr en horario hábil argentino (UTC-3). Configurar el trigger con cron: `0 8 * * 1-5`.
- Supabase free tier es suficiente para esta fase. Monitorear uso de storage si se guardan PDFs de pliegos.
- Google Drive se usa solo como repositorio de archivos adjuntos; los links se guardan en Supabase, no los archivos.
- Para los dos usuarios: crear ambos desde el panel de Supabase Auth inicialmente. No es necesario un sistema de invitaciones en Fase 1.

---

## Próximos Pasos Inmediatos

1. ~~Crear repositorio con la estructura de carpetas definida~~ ✅
2. ~~Inicializar proyecto Next.js con TypeScript + Tailwind + shadcn/ui~~ ✅
3. Crear proyecto en Supabase y correr las migraciones del schema (ver `lib/supabase/SETUP.md`)
4. Investigar endpoints de la API de ComprAR para el primer workflow
5. Construir el primer workflow de n8n con datos de prueba
6. Armar el dashboard con datos mockeados antes de conectar la API real
7. ~~Crear CLAUDE.md y SECURITY.md~~ ✅
