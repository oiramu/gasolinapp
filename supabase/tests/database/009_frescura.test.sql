-- 2.1: confirmed_at reemplaza a expires_at; report_price lo llena al reportar y al corregir.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(9);

SELECT col_not_null('public', 'fuel_prices', 'confirmed_at', 'confirmed_at no admite null');
SELECT col_default_is('public', 'fuel_prices', 'confirmed_at', 'now()', 'confirmed_at arranca en now()');
SELECT hasnt_column('public', 'fuel_prices', 'expires_at', 'expires_at ya no existe');
SELECT ok(
  NOT (SELECT prosrc FROM pg_proc WHERE oid = 'public.report_price(uuid, text, integer, text)'::regprocedure) ILIKE '%expires_at%',
  'report_price no toca expires_at'
);
SELECT ok(
  has_function_privilege('anon', 'public.report_price(uuid, text, integer, text)', 'execute')
  AND NOT has_column_privilege('authenticated', 'public.fuel_prices', 'confirmed_at', 'UPDATE'),
  'privilegios: reportar sigue abierto y confirmed_at no se edita directo'
);

INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES ('00000000-0000-4000-8000-0000000000a9', 'authenticated', 'authenticated', true);
INSERT INTO public.stations (id, name, brand, lat, lng)
VALUES ('00000000-0000-0000-0000-0000000000a9', 'EDS frescura', 'Terpel', 10.98, -74.80);

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a9","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT public.report_price('00000000-0000-0000-0000-0000000000a9', 'corriente', 15900);
SELECT ok(
  (SELECT confirmed_at = created_at FROM public.fuel_prices WHERE station_id = '00000000-0000-0000-0000-0000000000a9'),
  'un reporte nuevo queda confirmado en el momento en que se reporta'
);

-- La corrección dentro de 30 min renueva la confirmación (se simula un reporte de hace 20 min)
RESET ROLE;
UPDATE public.fuel_prices SET confirmed_at = now() - interval '20 minutes', created_at = now() - interval '20 minutes'
 WHERE station_id = '00000000-0000-0000-0000-0000000000a9';
SET LOCAL ROLE authenticated;

SELECT public.report_price('00000000-0000-0000-0000-0000000000a9', 'corriente', 15950);
SELECT results_eq(
  $$SELECT count(*)::int, max(price)::int, bool_and(confirmed_at > now() - interval '1 minute')
      FROM public.fuel_prices WHERE station_id = '00000000-0000-0000-0000-0000000000a9'$$,
  $$VALUES (1, 15950, true)$$,
  'corregir dentro de 30 min actualiza el precio y renueva confirmed_at sin duplicar'
);
SELECT throws_ok(
  $$UPDATE public.fuel_prices SET confirmed_at = now() WHERE station_id = '00000000-0000-0000-0000-0000000000a9'$$,
  '42501', NULL, 'abuso: el cliente no renueva la confirmación directo'
);
SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-0000000000a9', 'corriente', 50000)$$,
  '22023', 'OUT_OF_RANGE', 'las validaciones de report_price siguen intactas'
);

SELECT * FROM finish();
ROLLBACK;
