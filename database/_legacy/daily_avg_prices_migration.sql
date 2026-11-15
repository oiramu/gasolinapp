-- ══════════════════════════════════════════════════════════════════════════
--  GasolinApp — Migración: Vista materializada daily_avg_prices
--  Ejecutar en: Supabase Dashboard > SQL Editor
--  Verifica si ya existe antes de crearla.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Vista materializada ────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_avg_prices AS
SELECT
  station_id,
  fuel_type,
  DATE_TRUNC('day', created_at AT TIME ZONE 'America/Bogota') AS price_date,
  ROUND(AVG(price))    AS avg_price,
  MIN(price)           AS min_price,
  MAX(price)           AS max_price,
  COUNT(*)             AS report_count
FROM fuel_prices
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY
  station_id,
  fuel_type,
  DATE_TRUNC('day', created_at AT TIME ZONE 'America/Bogota');

-- ── Índices ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_avg_unique
  ON daily_avg_prices(station_id, fuel_type, price_date);

CREATE INDEX IF NOT EXISTS idx_daily_avg_lookup
  ON daily_avg_prices(station_id, fuel_type, price_date DESC);

-- ── Función de refresh ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_daily_avg_prices()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_avg_prices;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Trigger: refresh automático tras cada INSERT en fuel_prices ────────────
-- Estrategia: AFTER INSERT FOR EACH STATEMENT (bajo volumen de reportes)
DROP TRIGGER IF EXISTS trg_refresh_daily_avg ON fuel_prices;
CREATE TRIGGER trg_refresh_daily_avg
  AFTER INSERT ON fuel_prices
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_daily_avg_prices();

-- ── RLS: lectura pública (igual que fuel_prices) ───────────────────────────
-- Las vistas materializadas heredan permisos; si falla, ejecutar:
-- GRANT SELECT ON daily_avg_prices TO anon, authenticated;

-- ── Verificación: debe devolver filas si hay datos en fuel_prices ──────────
-- SELECT * FROM daily_avg_prices LIMIT 10;
