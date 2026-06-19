-- ============================================================================
-- Row Level Security (RLS) — Sistema de Seguimiento de Licitaciones
-- Ejecutar DESPUÉS de schema.sql.
-- ============================================================================
-- Modelo de acceso (Fase 1):
--   - Dos usuarios admin autenticados (rol `authenticated`) con acceso de lectura
--     a todo y escritura sobre sus propias notas de seguimiento.
--   - El rol `anon` (sin login) NO tiene acceso a nada.
--   - El workflow de n8n escribe usando el SERVICE ROLE KEY, que bypassa RLS por
--     diseño (es una clave privilegiada que vive solo en el servidor de n8n).
--
-- Patrón de performance (supabase-postgres-best-practices / security-rls-performance):
--   envolver auth.uid() en (select auth.uid()) para que se evalúe una sola vez
--   por query y no una vez por fila.
-- ============================================================================

-- Habilitar RLS en TODAS las tablas (deny-by-default: sin política = sin acceso).
alter table public.licitaciones       enable row level security;
alter table public.seguimientos       enable row level security;
alter table public.organismos_previos enable row level security;
alter table public.configuracion      enable row level security;
alter table public.historial_estado   enable row level security;

-- ----------------------------------------------------------------------------
-- licitaciones: cualquier usuario autenticado puede leer y actualizar estado.
-- (La inserción masiva la hace n8n con service_role, que ignora estas políticas.)
-- ----------------------------------------------------------------------------
create policy "licitaciones_select_authenticated"
  on public.licitaciones for select
  to authenticated
  using (true);

create policy "licitaciones_update_authenticated"
  on public.licitaciones for update
  to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- seguimientos: cada usuario gestiona SOLO sus propias notas.
-- ----------------------------------------------------------------------------
create policy "seguimientos_select_own"
  on public.seguimientos for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "seguimientos_insert_own"
  on public.seguimientos for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "seguimientos_update_own"
  on public.seguimientos for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "seguimientos_delete_own"
  on public.seguimientos for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- organismos_previos: lectura/escritura para autenticados (catálogo compartido).
-- ----------------------------------------------------------------------------
create policy "organismos_select_authenticated"
  on public.organismos_previos for select
  to authenticated
  using (true);

create policy "organismos_write_authenticated"
  on public.organismos_previos for all
  to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- configuracion: lectura para todos los autenticados; escritura también
-- (en Fase 2 se puede restringir a un sub-rol admin vía custom claim).
-- ----------------------------------------------------------------------------
create policy "configuracion_select_authenticated"
  on public.configuracion for select
  to authenticated
  using (true);

create policy "configuracion_update_authenticated"
  on public.configuracion for update
  to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- historial_estado: lectura para autenticados; inserción de su propio registro.
-- ----------------------------------------------------------------------------
create policy "historial_select_authenticated"
  on public.historial_estado for select
  to authenticated
  using (true);

create policy "historial_insert_authenticated"
  on public.historial_estado for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
