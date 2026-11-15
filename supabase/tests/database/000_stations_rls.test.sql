-- Hotfix 0.0: el cliente (anon/authenticated) solo puede leer `stations`.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(10);

-- Estructura de seguridad
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.stations'::regclass),
  'RLS activa en stations'
);

SELECT policies_are(
  'public', 'stations',
  ARRAY['Public read stations'],
  'stations solo tiene la política de lectura pública'
);

SELECT is(
  (SELECT proconfig FROM pg_proc WHERE oid = 'public.mark_station_has_gnv()'::regprocedure),
  ARRAY['search_path=public'],
  'mark_station_has_gnv tiene search_path fijo'
);

-- Fila de prueba creada como dueño (se descarta con el ROLLBACK)
INSERT INTO public.stations (id, name, brand, lat, lng)
VALUES ('00000000-0000-0000-0000-000000000001', 'EDS de prueba', 'Terpel', 10.98, -74.80);

-- Caso feliz: anon lee
SET LOCAL ROLE anon;

SELECT is(
  (SELECT name FROM public.stations WHERE id = '00000000-0000-0000-0000-000000000001'),
  'EDS de prueba',
  'anon puede leer estaciones'
);

-- Abuso: anon no escribe
SELECT throws_ok(
  $$UPDATE public.stations SET name = 'hackeada' WHERE id = '00000000-0000-0000-0000-000000000001'$$,
  '42501', NULL,
  'anon no puede renombrar estaciones'
);

SELECT throws_ok(
  $$UPDATE public.stations SET is_active = false$$,
  '42501', NULL,
  'anon no puede desactivar estaciones'
);

SELECT throws_ok(
  $$DELETE FROM public.stations WHERE id = '00000000-0000-0000-0000-000000000001'$$,
  '42501', NULL,
  'anon no puede borrar estaciones'
);

SELECT throws_ok(
  $$INSERT INTO public.stations (name, brand, lat, lng) VALUES ('Falsa', 'X', 0, 0)$$,
  '42501', NULL,
  'anon no puede crear estaciones'
);

-- Abuso: authenticated tampoco escribe
RESET ROLE;
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$UPDATE public.stations SET lat = 0, lng = 0$$,
  '42501', NULL,
  'authenticated no puede mover estaciones'
);

RESET ROLE;

SELECT is(
  (SELECT name FROM public.stations WHERE id = '00000000-0000-0000-0000-000000000001'),
  'EDS de prueba',
  'la estación sigue intacta tras los intentos'
);

SELECT * FROM finish();
ROLLBACK;
