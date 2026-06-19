-- ============================================================================
-- Seed inicial — Sistema de Seguimiento de Licitaciones
-- Ejecutar DESPUÉS de schema.sql y rls.sql.
-- ============================================================================

-- Fila única de configuración con los pesos por defecto del spec
-- (rubro 50 / participación 20 / monto 15 / días 15).
insert into public.configuracion (peso_rubro, peso_participacion, peso_monto, peso_dias, rubros_activos)
select 50, 20, 15, 15, array['informatica', 'ferreteria', 'indumentaria', 'epp', 'bazar']::text[]
where not exists (select 1 from public.configuracion);

-- NOTA: los dos usuarios admin se crean desde el panel de Supabase
--   (Authentication → Users → Add user), no por SQL. Ver lib/supabase/SETUP.md.
