-- 3.1: confirm_price (una confirmación por usuario, precio y día; renueva confirmed_at).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(13);

-- ── Privilegios ───────────────────────────────────────────────────────────────
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.price_confirmations'::regclass), 'RLS activa en price_confirmations');
SELECT policies_are('public', 'price_confirmations', ARRAY[]::name[], 'price_confirmations sin políticas: solo la RPC');
SELECT ok(
  NOT has_table_privilege('anon', 'public.price_confirmations', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.price_confirmations', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE'),
  'el cliente no lee ni escribe confirmaciones directo'
);
SELECT ok(
  (SELECT prosecdef AND proconfig = ARRAY['search_path=public'] FROM pg_proc WHERE oid = 'public.confirm_price(uuid)'::regprocedure)
  AND has_function_privilege('anon', 'public.confirm_price(uuid)', 'execute'),
  'confirm_price es SECURITY DEFINER con search_path fijo y ejecutable por el cliente'
);

-- ── Datos ─────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES ('00000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', true),
       ('00000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', true);
INSERT INTO public.stations (id, name, brand, lat, lng)
VALUES ('00000000-0000-0000-0000-0000000000c1', 'EDS confirmaciones', 'Terpel', 10.98, -74.80);
INSERT INTO public.fuel_prices (id, station_id, fuel_type, price, currency, price_unit, is_active, created_at, confirmed_at) VALUES
  ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-0000000000c1', 'corriente', 15900, 'COP', 'gallon', true, now() - interval '8 days', now() - interval '8 days'),
  ('00000000-0000-0000-0000-00000000c0a2', '00000000-0000-0000-0000-0000000000c1', 'extra', 18900, 'COP', 'gallon', false, now() - interval '8 days', now() - interval '8 days');

-- ── Caso feliz ────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT ok(
  public.confirm_price('00000000-0000-0000-0000-00000000c0a1') > now() - interval '1 minute',
  'confirmar devuelve el confirmed_at nuevo'
);
SELECT ok(
  (SELECT confirmed_at > now() - interval '1 minute' FROM public.fuel_prices WHERE id = '00000000-0000-0000-0000-00000000c0a1'),
  'el precio queda confirmado ahora (de viejo a fresco)'
);
SELECT throws_ok(
  $$SELECT public.confirm_price('00000000-0000-0000-0000-00000000c0a1')$$,
  'PT409', 'ALREADY_CONFIRMED', 'abuso: la misma persona no confirma dos veces el mismo día'
);

-- Otra persona sí puede confirmar el mismo precio
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.confirm_price('00000000-0000-0000-0000-00000000c0a1')$$, 'otra persona confirma el mismo precio');

-- ── Abusos ────────────────────────────────────────────────────────────────────
SELECT throws_ok(
  $$SELECT public.confirm_price('00000000-0000-0000-0000-00000000c0a2')$$,
  'PT404', 'PRICE_NOT_FOUND', 'abuso: no se confirma un precio inactivo'
);
SELECT throws_ok(
  $$SELECT public.confirm_price('00000000-0000-0000-0000-00000000dead')$$,
  'PT404', 'PRICE_NOT_FOUND', 'abuso: no se confirma un precio inexistente'
);
SELECT throws_ok(
  $$INSERT INTO public.price_confirmations (price_id, voter_id) VALUES ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-4000-8000-0000000000c2')$$,
  '42501', NULL, 'abuso: el cliente no inserta confirmaciones directo'
);

-- Límite: reportes + confirmaciones cuentan juntos (10 por hora). C2 lleva 1; se siembran 9 reportes.
RESET ROLE;
INSERT INTO public.fuel_prices (station_id, fuel_type, price, currency, price_unit, reporter_id)
SELECT '00000000-0000-0000-0000-0000000000c1', 'diesel', 11000, 'COP', 'gallon', '00000000-0000-4000-8000-0000000000c2' FROM generate_series(1, 9);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.confirm_price((SELECT id FROM public.fuel_prices WHERE fuel_type = 'diesel' LIMIT 1))$$,
  'PT429', 'RATE_LIMIT', 'abuso: confirmar cuenta para el límite de tasa general'
);

-- Sin sesión
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT public.confirm_price('00000000-0000-0000-0000-00000000c0a1')$$,
  '42501', 'NOT_AUTHENTICATED', 'abuso: confirmar sin sesión falla'
);

SELECT * FROM finish();
ROLLBACK;
