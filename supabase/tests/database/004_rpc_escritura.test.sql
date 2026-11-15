-- 1.3a: escrituras por RPC (report_price, add_report, suggest_station_services).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(39);

-- ── Estructura de seguridad ───────────────────────────────────────────────────
SELECT ok(
  (SELECT bool_and(relrowsecurity) FROM pg_class
    WHERE oid IN ('public.fuel_price_ranges'::regclass, 'public.service_suggestions'::regclass)),
  'RLS activa en fuel_price_ranges y service_suggestions'
);
SELECT policies_are('public', 'fuel_price_ranges', ARRAY['Public read fuel_price_ranges'], 'fuel_price_ranges solo se lee');
SELECT policies_are('public', 'service_suggestions', ARRAY[]::name[], 'service_suggestions no tiene políticas: solo la RPC la toca');
SELECT ok(
  (SELECT bool_and(prosecdef AND proconfig = ARRAY['search_path=public']) FROM pg_proc
    WHERE oid IN ('public.report_price(uuid, text, integer, text)'::regprocedure,
                  'public.add_report(uuid, text, text)'::regprocedure,
                  'public.suggest_station_services(uuid, jsonb)'::regprocedure)),
  'las tres RPC son SECURITY DEFINER con search_path fijo'
);
SELECT ok(
  has_function_privilege('anon', 'public.report_price(uuid, text, integer, text)', 'execute')
  AND has_function_privilege('authenticated', 'public.add_report(uuid, text, text)', 'execute')
  AND has_function_privilege('authenticated', 'public.suggest_station_services(uuid, jsonb)', 'execute'),
  'anon y authenticated pueden llamar las RPC'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public._writer_uid()', 'execute')
  AND NOT has_function_privilege('authenticated', 'public._require_active_station(uuid)', 'execute')
  AND NOT has_function_privilege('authenticated', 'public._check_rate_limit(bigint, integer)', 'execute'),
  'los helpers internos no se pueden llamar desde el cliente'
);

-- ── Datos de prueba (como dueño; se descartan con el ROLLBACK) ───────────────
INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', true),
       ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', true);

INSERT INTO public.stations (id, name, brand, lat, lng, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'EDS activa', 'Terpel', 10.98, -74.80, true),
  ('00000000-0000-0000-0000-000000000002', 'EDS activa 2', 'Biomax', 10.99, -74.81, true),
  ('00000000-0000-0000-0000-000000000003', 'EDS cerrada', 'Esso', 10.97, -74.79, false);

-- ── Usuario A: precios ────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT isnt(
  public.report_price('00000000-0000-0000-0000-000000000001', 'corriente', 15900, '  Sin cola  '),
  NULL,
  'report_price devuelve el id del precio'
);
SELECT results_eq(
  $$SELECT price::int, currency, price_unit::text, reported_by, reporter_id, comment FROM public.fuel_prices
     WHERE station_id = '00000000-0000-0000-0000-000000000001' AND fuel_type = 'corriente'$$,
  $$VALUES (15900, 'COP', 'gallon', 'Anónimo', '00000000-0000-4000-8000-0000000000a1'::uuid, 'Sin cola')$$,
  'el servidor fija moneda, unidad e identidad; el comentario queda recortado'
);
SELECT lives_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000001', 'gnv', 2500)$$,
  'reporta GNV sin comentario'
);
SELECT is(
  (SELECT price_unit::text FROM public.fuel_prices WHERE fuel_type = 'gnv'),
  'm3',
  'GNV se guarda en m3'
);
SELECT is(
  public.report_price('00000000-0000-0000-0000-000000000001', 'corriente', 15950),
  (SELECT id FROM public.fuel_prices WHERE station_id = '00000000-0000-0000-0000-000000000001' AND fuel_type = 'corriente'),
  'un segundo reporte en 30 min corrige el mismo precio'
);
SELECT results_eq(
  $$SELECT count(*)::int, max(price)::int FROM public.fuel_prices WHERE fuel_type = 'corriente'$$,
  $$VALUES (1, 15950)$$,
  'la corrección no duplica la fila'
);

SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000001', 'corriente', 50000)$$,
  '22023', 'OUT_OF_RANGE', 'abuso: precio fuera de rango'
);
SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000001', 'super', 15000)$$,
  '22023', 'INVALID_FUEL', 'abuso: combustible inválido'
);
SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000001', 'extra', NULL)$$,
  '22023', 'OUT_OF_RANGE', 'abuso: precio nulo'
);
SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000001', 'extra', 18000, repeat('x', 281))$$,
  '22023', 'INVALID_COMMENT', 'abuso: comentario de más de 280 caracteres'
);
SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000003', 'extra', 18000)$$,
  'PT404', 'STATION_NOT_FOUND', 'abuso: estación inactiva'
);
SELECT throws_ok(
  $$INSERT INTO public.fuel_price_ranges VALUES ('super', 1, 2, 'gallon')$$,
  '42501', NULL, 'abuso: el cliente no edita los rangos'
);

-- Límite: 10 precios por hora. A ya tiene 2; se siembran 8 más como dueño.
RESET ROLE;
INSERT INTO public.fuel_prices (station_id, fuel_type, price, currency, price_unit, reporter_id)
SELECT '00000000-0000-0000-0000-000000000002', 'diesel', 11000, 'COP', 'gallon', '00000000-0000-4000-8000-0000000000a1'
  FROM generate_series(1, 8);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000002', 'extra', 18000)$$,
  'PT429', 'RATE_LIMIT', 'abuso: el reporte 11 de la hora falla'
);
SELECT lives_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000001', 'gnv', 2550)$$,
  'corregir un precio reciente no cuenta como reporte nuevo'
);

-- ── Usuario A: reportes ───────────────────────────────────────────────────────
SELECT isnt(
  public.add_report('00000000-0000-0000-0000-000000000001', 'warning', '  Sin GNV hoy  '),
  NULL,
  'add_report devuelve el id del reporte'
);
SELECT results_eq(
  $$SELECT type, content, user_display_name, reporter_id FROM public.reports WHERE station_id = '00000000-0000-0000-0000-000000000001'$$,
  $$VALUES ('warning', 'Sin GNV hoy', 'Anónimo', '00000000-0000-4000-8000-0000000000a1'::uuid)$$,
  'el reporte queda con autor de la sesión y contenido recortado'
);
SELECT throws_ok(
  $$SELECT public.add_report('00000000-0000-0000-0000-000000000001', 'spam', 'Hola')$$,
  '22023', 'INVALID_TYPE', 'abuso: tipo de reporte inválido'
);
SELECT throws_ok(
  $$SELECT public.add_report('00000000-0000-0000-0000-000000000001', 'comment', '   ')$$,
  '22023', 'INVALID_CONTENT', 'abuso: contenido vacío'
);
SELECT throws_ok(
  $$SELECT public.add_report('00000000-0000-0000-0000-000000000001', 'comment', repeat('x', 281))$$,
  '22023', 'INVALID_CONTENT', 'abuso: contenido de más de 280 caracteres'
);

RESET ROLE;
INSERT INTO public.reports (station_id, type, content, reporter_id)
SELECT '00000000-0000-0000-0000-000000000002', 'comment', 'relleno', '00000000-0000-4000-8000-0000000000a1'
  FROM generate_series(1, 4);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.add_report('00000000-0000-0000-0000-000000000001', 'comment', 'Otro')$$,
  'PT429', 'RATE_LIMIT', 'abuso: el reporte 6 de la hora falla'
);

-- ── Sugerencias de servicios ──────────────────────────────────────────────────
SELECT is(
  public.suggest_station_services('00000000-0000-0000-0000-000000000001', '{"svc_lavadero": true}'),
  ARRAY[]::text[],
  'una sola sugerencia no se aplica'
);
SELECT is(
  (SELECT svc_lavadero FROM public.stations WHERE id = '00000000-0000-0000-0000-000000000001'),
  false,
  'la estación sigue sin lavadero'
);
SELECT throws_ok(
  $$SELECT public.suggest_station_services('00000000-0000-0000-0000-000000000001', '{"svc_inventado": true}')$$,
  '22023', 'INVALID_SERVICES', 'abuso: clave svc_* inventada'
);
SELECT throws_ok(
  $$SELECT public.suggest_station_services('00000000-0000-0000-0000-000000000001', '{"name": "Hackeada"}')$$,
  '22023', 'INVALID_SERVICES', 'abuso: columna que no es un servicio'
);
SELECT throws_ok(
  $$SELECT public.suggest_station_services('00000000-0000-0000-0000-000000000001', '{"svc_tienda": "si"}')$$,
  '22023', 'INVALID_SERVICES', 'abuso: valor que no es booleano'
);
SELECT lives_ok(
  $$SELECT public.suggest_station_services('00000000-0000-0000-0000-000000000001', '{"svc_lavadero": true}')$$,
  'repetir la sugerencia la reemplaza'
);

-- Usuario B coincide con A
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

SELECT is(
  public.suggest_station_services('00000000-0000-0000-0000-000000000001', '{"svc_lavadero": true, "svc_cafe": true}'),
  ARRAY['svc_lavadero'],
  'dos usuarios que coinciden aplican la clave; la que solo sugiere uno no'
);

-- ── Sin sesión ────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-000000000001', 'extra', 18000)$$,
  '42501', 'NOT_AUTHENTICATED', 'abuso: reportar precio sin sesión'
);
SELECT throws_ok(
  $$SELECT public.add_report('00000000-0000-0000-0000-000000000001', 'comment', 'Hola')$$,
  '42501', 'NOT_AUTHENTICATED', 'abuso: reportar sin sesión'
);
SELECT throws_ok(
  $$SELECT public.suggest_station_services('00000000-0000-0000-0000-000000000001', '{"svc_cafe": true}')$$,
  '42501', 'NOT_AUTHENTICATED', 'abuso: sugerir sin sesión'
);
SELECT throws_ok(
  $$SELECT count(*) FROM public.service_suggestions$$,
  '42501', NULL, 'abuso: anon no lee las sugerencias'
);

-- ── Estado final (como dueño) ─────────────────────────────────────────────────
RESET ROLE;

SELECT results_eq(
  $$SELECT svc_lavadero, svc_cafe FROM public.stations WHERE id = '00000000-0000-0000-0000-000000000001'$$,
  $$VALUES (true, false)$$,
  'la estación tiene lavadero y sigue sin café'
);
SELECT is(
  (SELECT count(*)::int FROM public.service_suggestions WHERE station_id = '00000000-0000-0000-0000-000000000001'),
  2,
  'una sugerencia vigente por usuario y estación'
);

SELECT * FROM finish();
ROLLBACK;
