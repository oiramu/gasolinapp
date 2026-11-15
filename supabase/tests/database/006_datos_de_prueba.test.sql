-- 1.4: estaciones de prueba y clear_my_test_data (solo borra lo propio en estaciones de prueba).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(9);

SELECT is(
  (SELECT count(*)::int FROM public.stations WHERE is_test AND is_active),
  3,
  'existen tres estaciones de prueba activas'
);
SELECT ok(
  (SELECT prosecdef AND proconfig = ARRAY['search_path=public'] FROM pg_proc WHERE oid = 'public.clear_my_test_data()'::regprocedure),
  'clear_my_test_data es SECURITY DEFINER con search_path fijo'
);

INSERT INTO auth.users (id, aud, role, is_anonymous)
VALUES ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', true),
       ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', true);
INSERT INTO public.stations (id, name, brand, lat, lng)
VALUES ('00000000-0000-0000-0000-0000000000e9', 'EDS real', 'Terpel', 10.98, -74.80);

-- Usuario E2 escribe en una estación de prueba (no se debe tocar)
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.report_price('00000000-0000-4000-a000-00000000e501', 'corriente', 15900);

-- Usuario E1 escribe en una de prueba y en una real
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
SELECT public.report_price('00000000-0000-4000-a000-00000000e501', 'extra', 18900);
SELECT public.report_price('00000000-0000-0000-0000-0000000000e9', 'extra', 18900);
SELECT public.add_report('00000000-0000-4000-a000-00000000e502', 'comment', 'prueba');
SELECT public.cast_vote('report', (SELECT id FROM public.reports WHERE content = 'prueba'), 1);
SELECT public.suggest_station_services('00000000-0000-4000-a000-00000000e503', '{"svc_bano": true}');

SELECT is(public.clear_my_test_data(), 4, 'borra mis 4 filas de prueba: precio, reporte, voto y sugerencia');
SELECT is(public.clear_my_test_data(), 0, 'repetir no borra nada más');

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.fuel_prices WHERE reporter_id = '00000000-0000-4000-8000-0000000000e1'),
  1,
  'abuso: mi precio en una estación real sigue ahí'
);
SELECT is(
  (SELECT count(*)::int FROM public.fuel_prices WHERE reporter_id = '00000000-0000-4000-8000-0000000000e2'),
  1,
  'abuso: el precio de otro usuario en la estación de prueba sigue ahí'
);
SELECT is(
  (SELECT count(*)::int FROM public.votes WHERE voter_id = '00000000-0000-4000-8000-0000000000e1'),
  0,
  'mis votos de prueba se borraron'
);

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '', true);
SELECT throws_ok(
  $$SELECT public.clear_my_test_data()$$,
  '42501', 'NOT_AUTHENTICATED', 'abuso: limpiar sin sesión falla'
);
SELECT throws_ok(
  $$UPDATE public.stations SET is_test = false$$,
  '42501', NULL, 'abuso: el cliente no cambia is_test'
);

SELECT * FROM finish();
ROLLBACK;
