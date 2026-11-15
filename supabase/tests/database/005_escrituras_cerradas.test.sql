-- 1.3c: el cliente (anon y authenticated) no escribe directo en ninguna tabla; solo por RPC.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(36);

-- ── Esquema: ninguna política pública de escritura ────────────────────────────
SELECT is_empty(
  $$SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND cmd <> 'SELECT'$$,
  'no queda ninguna política de INSERT, UPDATE, DELETE ni ALL en public'
);

-- ── Privilegios: solo SELECT (sin TRUNCATE, REFERENCES ni TRIGGER) ────────────
SELECT ok(
  NOT has_table_privilege(r.role, format('public.%I', t.name), 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'),
  format('%s no tiene privilegios de escritura sobre %s', r.role, t.name)
)
FROM (VALUES ('anon'), ('authenticated')) AS r(role)
CROSS JOIN (VALUES ('zones'), ('stations'), ('fuel_prices'), ('reports'), ('votes'), ('service_suggestions'), ('fuel_price_ranges'),
                   ('latest_prices'), ('daily_avg_prices'), ('v_station_summary')) AS t(name);

SELECT ok(
  bool_and(has_table_privilege('anon', format('public.%I', t.name), 'SELECT')),
  'anon sigue leyendo zonas, estaciones, precios, reportes, votos, rangos y vistas'
)
FROM (VALUES ('zones'), ('stations'), ('fuel_prices'), ('reports'), ('votes'), ('fuel_price_ranges'),
             ('latest_prices'), ('daily_avg_prices'), ('v_station_summary')) AS t(name);

-- ── Abuso: cada escritura directa falla ───────────────────────────────────────
INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES ('00000000-0000-4000-8000-0000000000d4', 'authenticated', 'authenticated', true);
INSERT INTO public.stations (id, name, brand, lat, lng)
VALUES ('00000000-0000-0000-0000-0000000000d4', 'EDS cerrada a escrituras', 'Terpel', 10.98, -74.80);

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d4","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(sql, '42501', NULL, format('abuso: authenticated no puede %s', label))
FROM (VALUES
  ($$INSERT INTO public.fuel_prices (station_id, fuel_type, price) VALUES ('00000000-0000-0000-0000-0000000000d4', 'extra', 1)$$, 'insertar precios'),
  ($$UPDATE public.fuel_prices SET price = 1$$, 'cambiar precios'),
  ($$UPDATE public.fuel_prices SET votes_up = 9999$$, 'inflar votos de precios'),
  ($$DELETE FROM public.fuel_prices$$, 'borrar precios'),
  ($$INSERT INTO public.reports (station_id, content) VALUES ('00000000-0000-0000-0000-0000000000d4', 'spam')$$, 'insertar reportes'),
  ($$UPDATE public.reports SET votes_up = 9999$$, 'inflar votos de reportes'),
  ($$DELETE FROM public.reports$$, 'borrar reportes'),
  ($$UPDATE public.stations SET name = 'Hackeada', lat = 0, is_active = false$$, 'editar estaciones'),
  ($$INSERT INTO public.votes (target_type, target_id, value) VALUES ('report', gen_random_uuid(), 1)$$, 'insertar votos'),
  ($$INSERT INTO public.service_suggestions (station_id, voter_id, services) VALUES ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-4000-8000-0000000000d4', '{}')$$, 'insertar sugerencias'),
  ($$UPDATE public.fuel_price_ranges SET max_price = 999999$$, 'cambiar los rangos'),
  ($$TRUNCATE public.reports$$, 'vaciar reportes')
) AS a(sql, label);

-- Caso feliz: las RPC siguen funcionando (SECURITY DEFINER)
SELECT lives_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-0000000000d4', 'extra', 18000)$$,
  'reportar por RPC sigue funcionando'
);

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '', true);

SELECT throws_ok(
  $$UPDATE public.stations SET is_active = false$$,
  '42501', NULL, 'abuso: anon no puede desactivar estaciones'
);

SELECT * FROM finish();
ROLLBACK;
