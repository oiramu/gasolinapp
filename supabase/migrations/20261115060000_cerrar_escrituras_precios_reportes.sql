-- 1.3c Contraer: el cliente ya escribe solo por RPC (1.2 y 1.3b en producción).
-- Se cierran las escrituras directas y el cliente queda con SELECT, nada más.
-- Idempotente: se puede correr dos veces sin error.

-- ── Políticas públicas de escritura ───────────────────────────────────────────
DROP POLICY IF EXISTS "Public insert fuel_prices" ON public.fuel_prices;
DROP POLICY IF EXISTS "Public vote fuel_prices"   ON public.fuel_prices;
DROP POLICY IF EXISTS "Public insert reports"     ON public.reports;
DROP POLICY IF EXISTS "Public vote reports"       ON public.reports;

-- Barrido: cualquier otra política de INSERT, UPDATE o DELETE en public (p. ej. creada desde el dashboard)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.schemaname, p.tablename, p.policyname
      FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$$;

-- ── Privilegios de tabla ──────────────────────────────────────────────────────
-- REVOKE ALL también quita TRUNCATE, REFERENCES y TRIGGER, que producción tenía para anon/authenticated.
REVOKE ALL ON public.zones, public.stations, public.fuel_prices, public.reports, public.votes,
              public.service_suggestions, public.fuel_price_ranges
  FROM anon, authenticated;

GRANT SELECT ON public.zones, public.stations, public.fuel_prices, public.reports, public.votes,
                public.fuel_price_ranges
  TO anon, authenticated;

-- Vistas: solo lectura
REVOKE ALL ON public.latest_prices, public.daily_avg_prices, public.v_station_summary FROM anon, authenticated;
GRANT SELECT ON public.latest_prices, public.daily_avg_prices, public.v_station_summary TO anon, authenticated;
