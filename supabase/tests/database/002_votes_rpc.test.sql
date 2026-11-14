-- 1.2: votos por RPC. Un voto por usuario y objetivo; contadores = legacy + COUNT(votes).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(30);

-- ── Estructura de seguridad ───────────────────────────────────────────────────
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.votes'::regclass), 'RLS activa en votes');
SELECT policies_are('public', 'votes', ARRAY['Public read votes'], 'votes solo tiene la política de lectura');
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_one_per_voter' AND contype = 'u'),
  'UNIQUE (target_type, target_id, voter_id)'
);
SELECT col_default_is('public', 'reports', 'legacy_votes_up', '0', 'la base legacy de reports arranca en 0 para filas nuevas');
SELECT col_not_null('public', 'fuel_prices', 'legacy_votes_down', 'la base legacy de fuel_prices no admite null');
SELECT ok(
  (SELECT bool_and(prosecdef AND proconfig = ARRAY['search_path=public'])
     FROM pg_proc
    WHERE oid IN ('public.cast_vote(text, uuid, integer)'::regprocedure, 'public.get_my_votes(uuid[])'::regprocedure)),
  'cast_vote y get_my_votes son SECURITY DEFINER con search_path fijo'
);
SELECT ok(
  has_function_privilege('anon', 'public.cast_vote(text, uuid, integer)', 'execute')
  AND has_function_privilege('authenticated', 'public.get_my_votes(uuid[])', 'execute'),
  'anon y authenticated pueden llamar las RPC'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public._lock_vote_target(text, uuid)', 'execute')
  AND NOT has_function_privilege('authenticated', 'public._refresh_vote_counts(text, uuid)', 'execute'),
  'los helpers internos no se pueden llamar desde el cliente'
);

-- ── Datos de prueba (como dueño; se descartan con el ROLLBACK) ───────────────
INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', true),
       ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', true);

INSERT INTO public.stations (id, name, brand, lat, lng)
VALUES ('00000000-0000-0000-0000-000000000001', 'EDS de prueba', 'Terpel', 10.98, -74.80);

-- e1: reporte con base legacy 5/1 · e2: reporte oculto · f1: precio activo
INSERT INTO public.reports (id, station_id, content, votes_up, votes_down, legacy_votes_up, legacy_votes_down, is_visible)
VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000001', 'Sin cola', 5, 1, 5, 1, true),
       ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000001', 'Spam', 0, 0, 0, 0, false);

INSERT INTO public.fuel_prices (id, station_id, fuel_type, price, currency, price_unit)
VALUES ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001', 'corriente', 15900, 'COP', 'gallon');

-- ── Usuario A ─────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.votes (target_type, target_id, value) VALUES ('report', '00000000-0000-0000-0000-0000000000e1', 1)$$,
  '42501', NULL, 'abuso: authenticated no inserta votos directo'
);
SELECT throws_ok(
  $$UPDATE public.votes SET value = -1$$,
  '42501', NULL, 'abuso: authenticated no edita votos directo'
);

SELECT results_eq(
  $$SELECT * FROM public.cast_vote('report', '00000000-0000-0000-0000-0000000000e1', 1)$$,
  $$VALUES (6, 1, 1::smallint)$$,
  'votar +1 suma sobre la base legacy y devuelve mi voto'
);
SELECT results_eq(
  $$SELECT * FROM public.cast_vote('report', '00000000-0000-0000-0000-0000000000e1', 1)$$,
  $$VALUES (5, 1, NULL::smallint)$$,
  'votar dos veces lo mismo quita el voto (toggle)'
);
SELECT is(
  (SELECT count(*)::int FROM public.votes WHERE voter_id = '00000000-0000-4000-8000-0000000000a1'),
  0,
  'el toggle elimina la fila'
);
SELECT lives_ok(
  $$SELECT public.cast_vote('report', '00000000-0000-0000-0000-0000000000e1', 1)$$,
  'vuelve a votar +1'
);
SELECT results_eq(
  $$SELECT * FROM public.cast_vote('report', '00000000-0000-0000-0000-0000000000e1', -1)$$,
  $$VALUES (5, 2, (-1)::smallint)$$,
  'cambiar de +1 a -1 ajusta ambos contadores'
);
SELECT is(
  (SELECT count(*)::int FROM public.votes WHERE voter_id = '00000000-0000-4000-8000-0000000000a1'),
  1,
  'votar varias veces no duplica la fila'
);

-- ── Usuario B ─────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

SELECT results_eq(
  $$SELECT * FROM public.cast_vote('report', '00000000-0000-0000-0000-0000000000e1', 1)$$,
  $$VALUES (6, 2, 1::smallint)$$,
  'un segundo usuario suma su propio voto'
);
SELECT results_eq(
  $$SELECT * FROM public.cast_vote('price', '00000000-0000-0000-0000-0000000000f1', -1)$$,
  $$VALUES (0, 1, (-1)::smallint)$$,
  'también se vota un precio activo'
);
SELECT results_eq(
  $$SELECT * FROM public.get_my_votes(ARRAY['00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1']::uuid[]) ORDER BY target_type$$,
  $$VALUES ('price', '00000000-0000-0000-0000-0000000000f1'::uuid, (-1)::smallint),
           ('report', '00000000-0000-0000-0000-0000000000e1'::uuid, 1::smallint)$$,
  'get_my_votes devuelve solo los votos de la sesión'
);

-- Abusos con sesión
SELECT throws_ok(
  $$SELECT public.cast_vote('report', '00000000-0000-0000-0000-0000000000e2', 1)$$,
  'PT404', 'TARGET_NOT_FOUND', 'abuso: no se vota un reporte oculto'
);
SELECT throws_ok(
  $$SELECT public.cast_vote('report', '00000000-0000-0000-0000-00000000dead', 1)$$,
  'PT404', 'TARGET_NOT_FOUND', 'abuso: no se vota un objetivo inexistente'
);
SELECT throws_ok(
  $$SELECT public.cast_vote('station', '00000000-0000-0000-0000-000000000001', 1)$$,
  '22023', 'INVALID_TARGET', 'abuso: tipo de objetivo inválido'
);
SELECT throws_ok(
  $$SELECT public.cast_vote('report', '00000000-0000-0000-0000-0000000000e1', 5)$$,
  '22023', 'INVALID_VOTE', 'abuso: valor de voto inválido'
);
SELECT throws_ok(
  $$SELECT public.get_my_votes(array_fill('00000000-0000-0000-0000-0000000000e1'::uuid, ARRAY[501]))$$,
  '22023', 'TOO_MANY_TARGETS', 'abuso: get_my_votes limita la cantidad de objetivos'
);

-- ── Sin sesión ────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.cast_vote('report', '00000000-0000-0000-0000-0000000000e1', 1)$$,
  '42501', 'NOT_AUTHENTICATED', 'abuso: votar sin sesión falla'
);
SELECT throws_ok(
  $$SELECT public.get_my_votes(ARRAY['00000000-0000-0000-0000-0000000000e1']::uuid[])$$,
  '42501', 'NOT_AUTHENTICATED', 'abuso: get_my_votes sin sesión falla'
);
SELECT throws_ok(
  $$INSERT INTO public.votes (target_type, target_id, voter_id, value)
    VALUES ('report', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-4000-8000-0000000000a1', 1)$$,
  '42501', NULL, 'abuso: anon no inserta votos a nombre de otro'
);
SELECT is(
  (SELECT count(*)::int FROM public.votes WHERE target_id = '00000000-0000-0000-0000-0000000000e1'),
  2,
  'anon puede leer los votos (SELECT público)'
);

-- ── Estado final (como dueño) ─────────────────────────────────────────────────
RESET ROLE;

SELECT results_eq(
  $$SELECT votes_up, votes_down FROM public.reports WHERE id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$VALUES (6, 2)$$,
  'los contadores quedan guardados en el reporte: legacy 5/1 + A(-1) + B(+1)'
);
SELECT results_eq(
  $$SELECT * FROM public._refresh_vote_counts('report', '00000000-0000-0000-0000-0000000000e1')$$,
  $$VALUES (6, 2)$$,
  'recalcular es idempotente (COUNT, no +1)'
);

SELECT * FROM finish();
ROLLBACK;
