-- GENERADO por src/shared/domain/sharedRules.db.test.ts desde shared/domain. No lo edites: corre `npx vitest -u`.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(4);

SELECT set_eq(
  $$SELECT fuel_type, min_price, max_price, price_unit::text FROM public.fuel_price_ranges$$,
  $$VALUES
  ('corriente', 12000, 20000, 'gallon'),
  ('extra', 13000, 25000, 'gallon'),
  ('diesel', 9000, 19000, 'gallon'),
  ('gnv', 1500, 5000, 'm3'),
  ('urea', 2000, 10000, 'gallon')$$,
  'fuel_price_ranges coincide con FUEL_PRICE_RANGES y las unidades de fuel.ts'
);

INSERT INTO auth.users (id, aud, role, is_anonymous) VALUES ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', true);
INSERT INTO public.stations (id, name, brand, lat, lng) VALUES ('00000000-0000-0000-0000-0000000000c3', 'EDS reglas', 'Terpel', 10.98, -74.80);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.add_report('00000000-0000-0000-0000-0000000000c3', 'comment', repeat('x', 280))$$,
  'add_report acepta REPORT_CONTENT_MAX_LENGTH (280) caracteres'
);
SELECT throws_ok(
  $$SELECT public.add_report('00000000-0000-0000-0000-0000000000c3', 'comment', repeat('x', 281))$$,
  '22023', 'INVALID_CONTENT', 'add_report rechaza 281 caracteres'
);
SELECT throws_ok(
  $$SELECT public.report_price('00000000-0000-0000-0000-0000000000c3', 'corriente', 12000, repeat('x', 281))$$,
  '22023', 'INVALID_COMMENT', 'report_price rechaza un comentario de 281 caracteres'
);

SELECT * FROM finish();
ROLLBACK;
