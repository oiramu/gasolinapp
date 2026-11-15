-- 2.2: precios oficiales de referencia (lectura pública, sin escritura del cliente, rango validado).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(17);

-- ── Privilegios ───────────────────────────────────────────────────────────────
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.reference_prices'::regclass), 'RLS activa en reference_prices');
SELECT policies_are('public', 'reference_prices', ARRAY['Public read reference_prices'], 'reference_prices solo tiene lectura');
SELECT ok(
  has_table_privilege('anon', 'public.reference_prices', 'SELECT')
  AND has_table_privilege('anon', 'public.current_reference_prices', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.reference_prices', 'INSERT, UPDATE, DELETE, TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.reference_prices', 'INSERT, UPDATE, DELETE, TRUNCATE'),
  'el cliente lee y no escribe'
);
SELECT ok(
  (SELECT reloptions @> ARRAY['security_invoker=true'] FROM pg_class WHERE oid = 'public.current_reference_prices'::regclass),
  'la vista aplica la RLS de quien consulta'
);
SELECT ok(NOT has_function_privilege('anon', 'public._check_reference_price_range()', 'execute'), 'el trigger no es ejecutable por el cliente');

-- ── Caso feliz: vigente = último valid_from que ya empezó ────────────────────
-- Datos propios: se descarta la carga mensual real (el ROLLBACK final la devuelve)
DELETE FROM public.reference_prices;
INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url) VALUES
  ('Barranquilla', 'corriente', DATE '2026-10-01', 15964, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Barranquilla', 'corriente', DATE '2026-11-01', 15970, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Barranquilla', 'corriente', (now() AT TIME ZONE 'America/Bogota')::date + 30, 16500, 'https://creg.gov.co/x'),
  ('Barranquilla', 'diesel',    DATE '2026-11-01', 11291, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/');

SET LOCAL ROLE anon;
SELECT results_eq(
  $$SELECT fuel_type, price FROM public.current_reference_prices WHERE city = 'Barranquilla' ORDER BY fuel_type$$,
  $$VALUES ('corriente'::text, 15970), ('diesel'::text, 11291)$$,
  'anon lee el precio vigente; uno con fecha futura todavía no rige'
);
SELECT throws_ok(
  $$INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url) VALUES ('X', 'extra', DATE '2026-11-01', 18000, 'https://x')$$,
  '42501', NULL, 'abuso: anon no inserta precios oficiales'
);
SELECT throws_ok(
  $$UPDATE public.reference_prices SET price = 1$$,
  '42501', NULL, 'abuso: anon no cambia precios oficiales'
);
RESET ROLE;

-- ── Validaciones de la tabla ──────────────────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url) VALUES ('Cali', 'corriente', DATE '2026-11-01', 50000, 'https://x')$$,
  '22023', 'OUT_OF_RANGE', 'precio fuera de rango'
);
SELECT throws_ok(
  $$INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url) VALUES ('Cali', 'super', DATE '2026-11-01', 15000, 'https://x')$$,
  '22023', 'INVALID_FUEL', 'combustible desconocido'
);
SELECT throws_ok(
  $$INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url) VALUES ('Cali', 'corriente', DATE '2026-11-01', 16000, 'http://x')$$,
  '23514', NULL, 'la fuente tiene que ser https'
);
SELECT throws_ok(
  $$INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url) VALUES (' Cali', 'corriente', DATE '2026-11-01', 16000, 'https://x')$$,
  '23514', NULL, 'la ciudad no puede tener espacios sobrantes'
);

-- ── Recordatorio mensual ──────────────────────────────────────────────────────
SELECT results_eq(
  $$SELECT schedule, command, active FROM cron.job WHERE jobname = 'check_reference_prices'$$,
  $$VALUES ('0 11 2 * *'::text, 'SELECT public.check_reference_prices_current()'::text, true)$$,
  'el recordatorio corre el día 2 de cada mes'
);
SELECT ok(NOT has_function_privilege('anon', 'public.check_reference_prices_current()', 'execute'), 'el cliente no dispara el recordatorio');

-- Con un precio vigente del mes en curso no hay alerta; sin precios del mes, sí
INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url)
VALUES ('Cali', 'corriente', date_trunc('month', now() AT TIME ZONE 'America/Bogota')::date, 16339, 'https://creg.gov.co/x');
SELECT ok(public.check_reference_prices_current(), 'mes con precios: sin alerta');
DELETE FROM public.reference_prices WHERE valid_from >= date_trunc('month', now() AT TIME ZONE 'America/Bogota')::date;
SELECT ok(NOT public.check_reference_prices_current(), 'mes sin precios: el chequeo falla');
SELECT is(
  (SELECT detail->>'action' FROM public.ops_alerts WHERE check_name = 'reference_prices'),
  'npm run reference-prices:import',
  'y deja una alerta con lo que hay que correr'
);

SELECT * FROM finish();
ROLLBACK;
