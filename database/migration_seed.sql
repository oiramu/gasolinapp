-- ══════════════════════════════════════════════════════════════════════════
--  GasolinApp — Migration: columnas necesarias para el seed de Colombia
--  Ejecutar ANTES de correr el seed script
--  Supabase Dashboard > SQL Editor > pegar y ejecutar
-- ══════════════════════════════════════════════════════════════════════════

-- Columnas extra en zones (contexto geográfico colombiano)
ALTER TABLE zones ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS dept TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS zones_code_unique ON zones(code) WHERE code IS NOT NULL;

-- osm_id en stations: clave de deduplicación del seed
ALTER TABLE stations ADD COLUMN IF NOT EXISTS osm_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS stations_osm_id_unique ON stations(osm_id) WHERE osm_id IS NOT NULL;

-- ── RPC actualizada: get_zone_averages ahora incluye city/dept ─────────────
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
  avg_super      DOUBLE PRECISION,
  avg_urea       DOUBLE PRECISION,
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
    ROUND(AVG(CASE WHEN fp.fuel_type = 'extra'  THEN fp.price END)::numeric, 3)::float AS avg_extra,
    ROUND(AVG(CASE WHEN fp.fuel_type = 'diesel' THEN fp.price END)::numeric, 3)::float AS avg_diesel,
    ROUND(AVG(CASE WHEN fp.fuel_type = 'super'  THEN fp.price END)::numeric, 3)::float AS avg_super,
    ROUND(AVG(CASE WHEN fp.fuel_type = 'urea'   THEN fp.price END)::numeric, 3)::float AS avg_urea,
    COUNT(DISTINCT s.id) AS station_count
  FROM zones z
  LEFT JOIN stations s      ON s.zone_id = z.id AND s.is_active = TRUE
  LEFT JOIN fuel_prices fp  ON fp.station_id = s.id AND fp.is_active = TRUE
  GROUP BY z.id, z.name, z.city, z.dept, z.code, z.lat, z.lng
  ORDER BY z.name;
$$;

-- ── Vista útil para debugging ──────────────────────────────────────────────
CREATE OR REPLACE VIEW v_station_summary AS
SELECT
  s.id,
  s.name,
  s.brand,
  s.address,
  s.lat,
  s.lng,
  z.name  AS zone_name,
  z.city  AS zone_city,
  z.dept  AS zone_dept,
  COUNT(fp.id) FILTER (WHERE fp.is_active) AS active_prices,
  MAX(fp.created_at) FILTER (WHERE fp.is_active) AS last_report
FROM stations s
LEFT JOIN zones z       ON z.id = s.zone_id
LEFT JOIN fuel_prices fp ON fp.station_id = s.id
WHERE s.is_active = TRUE
GROUP BY s.id, s.name, s.brand, s.address, s.lat, s.lng, z.name, z.city, z.dept
ORDER BY zone_name, s.name;

-- ── Query de verificación post-seed ───────────────────────────────────────
-- SELECT zone_city, COUNT(*) as estaciones FROM v_station_summary GROUP BY zone_city ORDER BY estaciones DESC;
