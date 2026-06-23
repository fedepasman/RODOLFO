-- ============================================================================
-- Sistema de Seguimiento de Licitaciones — Schema
-- Ejecutar en: Supabase SQL Editor (orden: 1. schema.sql  2. rls.sql  3. seed.sql)
-- ============================================================================
-- Convenciones (supabase-postgres-best-practices):
--   - identificadores en minúscula y snake_case
--   - PK uuid con default gen_random_uuid()
--   - índices en FKs y en columnas usadas por RLS / filtros frecuentes
--   - constraints CHECK para enums de dominio (en vez de tipos ENUM, más flexibles)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla: licitaciones
-- ----------------------------------------------------------------------------
create table if not exists public.licitaciones (
  id                    uuid primary key default gen_random_uuid(),
  portal                text not null check (portal in ('nacional', 'caba', 'pba')),
  numero                text not null,                 -- nº expediente/licitación
  titulo                text not null,
  organismo             text,
  rubro                 text,
  monto_estimado        numeric(15, 2),
  fecha_publicacion     date,
  fecha_cierre          date,
  url                   text,
  estado                text not null default 'nueva'
                          check (estado in ('nueva', 'seguimiento', 'presentada', 'descartada')),
  score                 integer not null default 0 check (score between 0 and 100),
  prioridad             text not null default 'baja'
                          check (prioridad in ('alta', 'media', 'baja')),
  participacion_previa  boolean not null default false,
  created_at            timestamptz not null default now(),

  -- Deduplicación: una licitación es única por portal + número de expediente.
  -- El workflow de n8n hace UPSERT contra esta constraint.
  constraint licitaciones_portal_numero_key unique (portal, numero)
);

-- Índices para los filtros del dashboard (portal, prioridad, estado, rubro)
-- y para el orden por score / fecha de cierre.
create index if not exists licitaciones_portal_idx       on public.licitaciones (portal);
create index if not exists licitaciones_estado_idx       on public.licitaciones (estado);
create index if not exists licitaciones_prioridad_idx    on public.licitaciones (prioridad);
create index if not exists licitaciones_rubro_idx        on public.licitaciones (rubro);
create index if not exists licitaciones_fecha_cierre_idx on public.licitaciones (fecha_cierre);
create index if not exists licitaciones_score_idx        on public.licitaciones (score desc);
create index if not exists licitaciones_created_at_idx   on public.licitaciones (created_at desc);

-- Migración v4: Campo revisada para marcar licitaciones ya analizadas
alter table public.licitaciones
  add column if not exists revisada boolean not null default false;

create index if not exists licitaciones_revisada_idx on public.licitaciones (revisada);

-- Migración v5: Resultado de licitaciones presentadas
alter table public.licitaciones
  add column if not exists resultado text check (resultado in ('ganada', 'perdida', 'desierta'));

-- ----------------------------------------------------------------------------
-- Migración v2: Detalle enriquecido desde ComprAR (scraping Puppeteer en n8n)
-- Ejecutar en Supabase SQL Editor DESPUÉS de la migración inicial.
-- ----------------------------------------------------------------------------
alter table public.licitaciones
  add column if not exists numero_expediente    text,
  add column if not exists tipo_procedimiento   text,
  add column if not exists modalidad            text,
  add column if not exists cronograma_detalle   jsonb,   -- {publicacion, fin_consultas, apertura}
  add column if not exists renglones            jsonb,   -- [{descripcion, cantidad, unidad, codigo}]
  add column if not exists proveedores_invitados jsonb,  -- [{razon_social, cuit}]
  add column if not exists url_detalle          text;    -- URL real capturada por Puppeteer

-- ----------------------------------------------------------------------------
-- Migración v3: Rubros configurables con keywords dinámicas
-- Ejecutar en Supabase SQL Editor DESPUÉS de schema.sql + rls.sql.
-- ----------------------------------------------------------------------------
create table if not exists public.rubros (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique check (nombre ~ '^[a-z_]+$'),
  label     text not null,
  keywords  text[] not null default '{}',
  activo    boolean not null default true,
  orden     integer not null default 0
);

create index if not exists rubros_activo_idx on public.rubros (activo);
create index if not exists rubros_orden_idx  on public.rubros (orden);

-- ----------------------------------------------------------------------------
-- Tabla: seguimientos (notas + adjuntos por usuario sobre una licitación)
-- ----------------------------------------------------------------------------
create table if not exists public.seguimientos (
  id             uuid primary key default gen_random_uuid(),
  licitacion_id  uuid not null references public.licitaciones (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  nota           text,
  archivo_drive  text,                                  -- link a Google Drive (no el archivo)
  updated_at     timestamptz not null default now()
);

create index if not exists seguimientos_licitacion_id_idx on public.seguimientos (licitacion_id);
create index if not exists seguimientos_user_id_idx       on public.seguimientos (user_id);

-- ----------------------------------------------------------------------------
-- Tabla: organismos_previos (historial de participación con cada organismo)
-- ----------------------------------------------------------------------------
create table if not exists public.organismos_previos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  cuit_organismo  text,
  participamos    boolean not null default false,
  resultado       text check (resultado in ('ganada', 'perdida', 'desierta'))
);

create index if not exists organismos_previos_nombre_idx on public.organismos_previos (nombre);

-- ----------------------------------------------------------------------------
-- Tabla: configuracion (pesos de ponderación, una sola fila)
-- ----------------------------------------------------------------------------
create table if not exists public.configuracion (
  id                  uuid primary key default gen_random_uuid(),
  peso_rubro          integer not null default 50,
  peso_participacion  integer not null default 20,
  peso_monto          integer not null default 15,
  peso_dias           integer not null default 15,
  rubros_activos      text[] not null default array[
                        'informatica', 'ferreteria', 'indumentaria', 'epp', 'bazar', 'mantenimiento'
                      ]::text[],
  updated_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tabla: historial_estado (auditoría de cambios de estado — usado en el detalle)
-- ----------------------------------------------------------------------------
create table if not exists public.historial_estado (
  id             uuid primary key default gen_random_uuid(),
  licitacion_id  uuid not null references public.licitaciones (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete set null,
  estado_anterior text,
  estado_nuevo   text not null,
  created_at     timestamptz not null default now()
);

create index if not exists historial_estado_licitacion_id_idx on public.historial_estado (licitacion_id);

-- ----------------------------------------------------------------------------
-- Tabla: google_tokens (tokens OAuth de Google Calendar por usuario)
-- Migración v6: Integración Google Calendar
-- ----------------------------------------------------------------------------
create table if not exists public.google_tokens (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tabla: calendar_events (mapeo de licitaciones a eventos de Google Calendar)
-- Migración v6: Integración Google Calendar
-- ----------------------------------------------------------------------------
create table if not exists public.calendar_events (
  licitacion_id uuid not null references public.licitaciones (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  event_id      text not null,
  primary key (licitacion_id, user_id)
);

create index if not exists calendar_events_user_id_idx on public.calendar_events (user_id);
