-- Endurecimiento de los advisors: funciones internas cerradas, search_path fijo, vista con
-- security_invoker y privilegios por defecto cerrados.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(15);

SELECT ok(
  NOT bool_or(has_function_privilege(r.role, f.sig, 'execute')),
  format('%s no ejecuta funciones de trigger ni de refresco', r.role)
)
FROM (VALUES ('anon'), ('authenticated')) AS r(role)
CROSS JOIN (VALUES ('public.refresh_latest_prices()'), ('public.refresh_daily_avg_prices()'),
                   ('public.mark_station_has_gnv()'), ('public.sync_station_location()')) AS f(sig)
GROUP BY r.role;

SELECT ok(
  has_function_privilege('anon', 'public.get_zone_averages()', 'execute'),
  'anon sigue leyendo los promedios por zona'
);

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('refresh_latest_prices', 'refresh_daily_avg_prices', 'sync_station_location', 'get_zone_averages', 'mark_station_has_gnv')
      AND p.proconfig @> ARRAY['search_path=public']),
  5,
  'las funciones heredadas tienen search_path fijo'
);

SELECT ok(
  (SELECT reloptions @> ARRAY['security_invoker=true'] FROM pg_class WHERE oid = 'public.v_station_summary'::regclass),
  'v_station_summary aplica la RLS de quien consulta'
);
SELECT ok(
  bool_and(has_table_privilege('anon', format('public.%I', t.name), 'SELECT')),
  'anon lee todo lo que lee v_station_summary (stations, zones, fuel_prices) y la vista'
)
FROM (VALUES ('stations'), ('zones'), ('fuel_prices'), ('v_station_summary')) AS t(name);

-- Privilegios por defecto: objetos nuevos nacen cerrados para el cliente
CREATE TABLE public.tabla_nueva_de_prueba (id int);
CREATE FUNCTION public.funcion_nueva_de_prueba() RETURNS int LANGUAGE sql AS 'SELECT 1';

SELECT ok(
  NOT has_table_privilege('anon', 'public.tabla_nueva_de_prueba', 'INSERT, UPDATE, DELETE, TRUNCATE, MAINTAIN'),
  'una tabla nueva no nace con escritura ni MAINTAIN para anon'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.tabla_nueva_de_prueba', 'INSERT, UPDATE, DELETE, TRUNCATE'),
  'una tabla nueva no nace con escritura para authenticated'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.funcion_nueva_de_prueba()', 'execute'),
  'una función nueva no nace ejecutable por anon'
);
SELECT is_empty(
  $$SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
     WHERE p.oid = 'public.funcion_nueva_de_prueba()'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'$$,
  'una función nueva no nace ejecutable por PUBLIC'
);

-- Caso feliz: los triggers siguen corriendo al reportar por RPC (inserta y refresca vistas)
INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES ('00000000-0000-4000-8000-0000000000f7', 'authenticated', 'authenticated', true);
INSERT INTO public.stations (id, name, brand, lat, lng)
VALUES ('00000000-0000-0000-0000-0000000000f7', 'EDS advisors', 'Terpel', 10.98, -74.80);

-- La vista devuelve lo mismo como dueño (lo que daba con SECURITY DEFINER) que como anon (security_invoker)
INSERT INTO public.fuel_prices (station_id, fuel_type, price, currency, price_unit, is_active)
VALUES ('00000000-0000-0000-0000-0000000000f7', 'extra', 18000, 'COP', 'gallon', true),
       ('00000000-0000-0000-0000-0000000000f7', 'diesel', 11000, 'COP', 'gallon', false);
CREATE TEMP TABLE vista_como_dueno AS SELECT * FROM public.v_station_summary;
GRANT SELECT ON vista_como_dueno TO anon;

SET LOCAL ROLE anon;
SELECT set_eq(
  $$SELECT * FROM public.v_station_summary$$,
  $$SELECT * FROM vista_como_dueno$$,
  'v_station_summary da las mismas filas como anon que como dueño'
);
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f7","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-0000000000f7', 'gnv', 2500)$$,
  'reportar sigue funcionando con los triggers cerrados al cliente'
);
SELECT ok(
  (SELECT has_gnv FROM public.stations WHERE id = '00000000-0000-0000-0000-0000000000f7'),
  'el trigger mark_station_has_gnv corrió'
);
SELECT is(
  (SELECT price::int FROM public.latest_prices WHERE station_id = '00000000-0000-0000-0000-0000000000f7' AND fuel_type = 'gnv'),
  2500,
  'el trigger de refresco actualizó latest_prices'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.refresh_latest_prices()', 'execute'),
  'aun así, authenticated no puede refrescar a pedido'
);

SELECT * FROM finish();
ROLLBACK;
