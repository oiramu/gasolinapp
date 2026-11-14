-- 0.4: el realtime publica los cambios de las tablas que la app escucha.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(2);

SELECT set_eq(
  $$SELECT tablename::text FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public'$$,
  ARRAY['fuel_prices', 'reports', 'stations'],
  'supabase_realtime publica exactamente fuel_prices, reports y stations'
);

-- Abuso: el realtime no abre lectura extra; anon sigue viendo solo lo que su RLS permite
SELECT policies_are(
  'public', 'fuel_prices',
  ARRAY['Public read fuel_prices', 'Public insert fuel_prices', 'Public vote fuel_prices'],
  'publicar fuel_prices no cambia sus políticas (las cierra la 1.3)'
);

SELECT * FROM finish();
ROLLBACK;
