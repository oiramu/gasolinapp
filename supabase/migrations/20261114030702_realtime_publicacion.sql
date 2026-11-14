-- ════════════════════════════════════════════════════════════════════════════
-- 0.4 — Activar realtime para estaciones, precios y reportes
--
-- La app ya se suscribe a postgres_changes de estas tablas, pero la publicación
-- `supabase_realtime` estaba vacía: ningún evento llegaba. El cliente ahora
-- parchea su caché con cada evento (sin recargar todas las estaciones).
-- Los eventos respetan la RLS de SELECT de cada suscriptor.
--
-- Idempotente: solo agrega las tablas que todavía no están publicadas.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  _table text;
BEGIN
  FOREACH _table IN ARRAY ARRAY['fuel_prices', 'reports', 'stations'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = _table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _table);
    END IF;
  END LOOP;
END
$$;
