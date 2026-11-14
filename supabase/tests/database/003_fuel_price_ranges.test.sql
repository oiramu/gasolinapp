-- GENERADO por src/shared/domain/fuelPriceRanges.db.test.ts desde fuel.ts. No lo edites: corre `npx vitest -u`.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(1);

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

SELECT * FROM finish();
ROLLBACK;
