-- ============================================================================
-- Seed inicial — Sistema de Seguimiento de Licitaciones
-- Ejecutar DESPUÉS de schema.sql y rls.sql.
-- ============================================================================

-- Fila única de configuración con los pesos por defecto del spec
-- (rubro 50 / participación 20 / monto 15 / días 15).
insert into public.configuracion (peso_rubro, peso_participacion, peso_monto, peso_dias, rubros_activos)
select 50, 20, 15, 15, array['informatica', 'ferreteria', 'indumentaria', 'epp', 'bazar']::text[]
where not exists (select 1 from public.configuracion);

-- Rubros con keywords iniciales (migración v3)
insert into public.rubros (nombre, label, keywords, activo, orden) values
  ('informatica',   'Informática y tecnología',   array['informatic','tecnolog','software','hardware','sistema','licencia','computadora','servidor','internet','digital','electroni','impres','monitor','teclado','mouse','router','switch','firewall','ups'], true, 1),
  ('ferreteria',    'Ferretería y herramientas',   array['ferreter','herramienta','tornillo','pintura','construcc','materiales','buloneria','soldadura','tubo','cable elect'], true, 2),
  ('indumentaria',  'Indumentaria y calzado',      array['indumentaria','calzado','ropa','uniforme','vestimenta','textil','tela','prenda','campera','pantalon','camisa','bota'], true, 3),
  ('epp',           'EPP (Protección Personal)',   array['epp','protecci personal','casco','guante','chaleco','barbijo','seguridad laboral','antiparras','respirador','mameluco','arnes'], true, 4),
  ('bazar',         'Bazar y vajilla',             array['bazar','vajilla','utensilio','cocina','menaje','cristaler','cubierto','olla','bandeja','cafetera','dispenser'], true, 5),
  ('mantenimiento', 'Mantenimiento y servicios',   array['mantenimiento','limpieza','edificio','plomeria','electricidad','electric','sanitario','aire acondicionado','ascensor','pintura','jardineria','fumigacion','conservacion','reparacion'], true, 6)
on conflict (nombre) do nothing;

-- NOTA: los dos usuarios admin se crean desde el panel de Supabase
--   (Authentication → Users → Add user), no por SQL. Ver lib/supabase/SETUP.md.
