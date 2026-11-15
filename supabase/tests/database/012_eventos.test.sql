-- 3.4: track (eventos anónimos: lista cerrada, props ≤ 1 KB, límite de tasa, solo por RPC).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(18);

-- ── Privilegios ───────────────────────────────────────────────────────────────
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.events'::regclass), 'RLS activa en events');
SELECT policies_are('public', 'events', ARRAY[]::name[], 'events sin políticas: solo la RPC');
SELECT ok(
  NOT has_table_privilege('anon', 'public.events', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.events', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE'),
  'el cliente no lee ni escribe eventos directo'
);
SELECT ok(
  (SELECT prosecdef AND proconfig = ARRAY['search_path=public'] FROM pg_proc WHERE oid = 'public.track(text, jsonb)'::regprocedure)
  AND has_function_privilege('anon', 'public.track(text, jsonb)', 'execute')
  AND has_function_privilege('authenticated', 'public.track(text, jsonb)', 'execute'),
  'track es SECURITY DEFINER con search_path fijo y ejecutable por el cliente'
);
SELECT enum_has_labels('public', 'event_name',
  ARRAY['app_open', 'station_open', 'price_reported', 'price_confirmed', 'vote', 'share'],
  'la lista cerrada de eventos');

-- ── Datos ─────────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', true),
       ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', true);

-- ── Caso feliz ────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT lives_ok($$SELECT public.track('station_open', '{"station_id":"00000000-0000-0000-0000-0000000000c1"}')$$, 'registra station_open con sus props');
SELECT lives_ok($$SELECT public.track('app_open')$$, 'sin props: objeto vacío');
SELECT lives_ok($$SELECT public.track('vote', NULL)$$, 'props NULL: objeto vacío');

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE user_id = '00000000-0000-4000-8000-0000000000e1'),
  3, 'los eventos quedan con el uid de la sesión'
);
SELECT is(
  (SELECT props->>'station_id' FROM public.events WHERE user_id = '00000000-0000-4000-8000-0000000000e1' AND name = 'station_open'),
  '00000000-0000-0000-0000-0000000000c1', 'las props se guardan tal cual'
);
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE user_id = '00000000-0000-4000-8000-0000000000e1' AND name IN ('app_open', 'vote') AND props = '{}'::jsonb),
  2, 'sin props o con NULL se guarda {}'
);
SET LOCAL ROLE authenticated;

-- ── Abusos ────────────────────────────────────────────────────────────────────
SELECT throws_ok($$SELECT public.track('login', '{}')$$, '22023', 'INVALID_EVENT', 'abuso: un nombre fuera de la lista falla');
SELECT throws_ok($$SELECT public.track(NULL, '{}')$$, '22023', 'INVALID_EVENT', 'abuso: sin nombre falla');
SELECT throws_ok($$SELECT public.track('share', '[1, 2]')$$, '22023', 'INVALID_PROPS', 'abuso: props que no son un objeto fallan');
SELECT throws_ok(
  format($$SELECT public.track('share', jsonb_build_object('x', %L))$$, repeat('a', 1100)),
  '22023', 'INVALID_PROPS', 'abuso: props de más de 1 KB fallan'
);
SELECT throws_ok(
  $$INSERT INTO public.events (name, user_id) VALUES ('vote', '00000000-0000-4000-8000-0000000000e1')$$,
  '42501', NULL, 'abuso: el cliente no inserta eventos directo'
);

-- Límite: 300 eventos por hora. Se siembran 300 para E2.
RESET ROLE;
INSERT INTO public.events (name, user_id)
SELECT 'station_open', '00000000-0000-4000-8000-0000000000e2' FROM generate_series(1, 300);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.track('app_open')$$, 'PT429', 'RATE_LIMIT', 'abuso: más de 300 eventos por hora falla');

-- Sin sesión
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.track('app_open')$$, '42501', 'NOT_AUTHENTICATED', 'abuso: registrar sin sesión falla');

SELECT * FROM finish();
ROLLBACK;
