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
  ARRAY['Public read fuel_prices'],
  'publicar fuel_prices no abre políticas: solo la lectura (la 1.3c cerró las de escritura)'
);

SELECT * FROM finish();
ROLLBACK;
