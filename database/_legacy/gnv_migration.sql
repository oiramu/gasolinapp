-- ══════════════════════════════════════════════════════════════════════════
--  GasolinApp — Migración GNV (Gas Natural Vehicular) - CORREGIDA
--  Ejecutar en: Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- ── PASO PREVIO: Consolidar 'corriente' para evitar errores de constraint ─────
-- Algunos registros podrían tener 'super' si se siguió el schema.sql original.
-- El frontend usa 'corriente' como clave pública.

UPDATE fuel_prices SET fuel_type = 'corriente' WHERE fuel_type = 'super';


-- ── MIGRACIÓN 1 — Actualizar CHECK constraint en fuel_prices ─────────────────
-- fuel_type es VARCHAR con CHECK constraint.

ALTER TABLE fuel_prices DROP CONSTRAINT IF EXISTS fuel_prices_fuel_type_check;
ALTER TABLE fuel_prices
  ADD CONSTRAINT fuel_prices_fuel_type_check
  CHECK (fuel_type IN ('extra', 'corriente', 'diesel', 'urea', 'gnv'));

-- Verificación:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'fuel_prices_fuel_type_check';


-- ── MIGRACIÓN 2 — Columna price_unit en fuel_prices ───────────────────────
ALTER TABLE fuel_prices
  ADD COLUMN IF NOT EXISTS price_unit VARCHAR(10)
  NOT NULL DEFAULT 'gallon'
  CHECK (price_unit IN ('gallon', 'm3'));


-- ── MIGRACIÓN 3 — Flag has_gnv en stations ────────────────────────────────
ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS has_gnv BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_stations_has_gnv
  ON stations(has_gnv)
  WHERE has_gnv = true;


-- ── MIGRACIÓN 4 — Trigger: auto-marcar estación con GNV al insertar reporte ─
CREATE OR REPLACE FUNCTION mark_station_has_gnv()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fuel_type = 'gnv' THEN
    UPDATE stations
    SET has_gnv = true
    WHERE id = NEW.station_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mark_station_has_gnv ON fuel_prices;
CREATE TRIGGER trg_mark_station_has_gnv
  AFTER INSERT ON fuel_prices
  FOR EACH ROW
  EXECUTE FUNCTION mark_station_has_gnv();


-- ── MIGRACIÓN 5 — Vista materializada latest_prices ───────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS latest_prices AS
SELECT DISTINCT ON (station_id, fuel_type)
  station_id,
  fuel_type,
  price,
  price_unit,
  created_at    AS reported_at,
  reported_by
FROM fuel_prices
WHERE is_active = true
ORDER BY station_id, fuel_type, created_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_latest_prices_station_fuel
  ON latest_prices(station_id, fuel_type);

CREATE INDEX IF NOT EXISTS idx_latest_prices_fuel_type
  ON latest_prices(fuel_type);

CREATE OR REPLACE FUNCTION refresh_latest_prices()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY latest_prices;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_refresh_latest_prices ON fuel_prices;
CREATE TRIGGER trg_refresh_latest_prices
  AFTER INSERT ON fuel_prices
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_latest_prices();


-- ── MIGRACIÓN 6 — RLS: verificar y proteger has_gnv ───────────────────────
-- Sin cambios necesarios.


-- ── MIGRACIÓN 7 — Actualizar RPC get_zone_averages con avg_gnv ────────────
-- Consolidado: 'corriente' en vez de 'super'

DROP FUNCTION IF EXISTS get_zone_averages();

CREATE OR REPLACE FUNCTION get_zone_averages()
RETURNS TABLE (
  id             UUID,
  name           TEXT,
  city           TEXT,
  dept           TEXT,
  code           TEXT,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  avg_extra      DOUBLE PRECISION,
  avg_diesel     DOUBLE PRECISION,
  avg_corriente  DOUBLE PRECISION,
  avg_urea       DOUBLE PRECISION,
  avg_gnv        DOUBLE PRECISION,
  station_count  BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    z.id,
    z.name,
    z.city,
    z.dept,
    z.code,
    z.lat,
    z.lng,
    ROUND(AVG(CASE WHEN fp.fuel_type = 'extra'     THEN fp.price END)::numeric, 3)::float AS avg_extra,
    ROUND(AVG(CASE WHEN fp.fuel_type = 'diesel'    THEN fp.price END)::numeric, 3)::float AS avg_diesel,
    ROUND(AVG(CASE WHEN fp.fuel_type = 'corriente' THEN fp.price END)::numeric, 3)::float AS avg_corriente,
    ROUND(AVG(CASE WHEN fp.fuel_type = 'urea'      THEN fp.price END)::numeric, 3)::float AS avg_urea,
    ROUND(AVG(CASE WHEN fp.fuel_type = 'gnv'       THEN fp.price END)::numeric, 3)::float AS avg_gnv,
    COUNT(DISTINCT s.id) AS station_count
  FROM zones z
  LEFT JOIN stations s      ON s.zone_id = z.id AND s.is_active = TRUE
  LEFT JOIN fuel_prices fp  ON fp.station_id = s.id AND fp.is_active = TRUE
  GROUP BY z.id, z.name, z.city, z.dept, z.code, z.lat, z.lng
  ORDER BY z.name;
$$;
