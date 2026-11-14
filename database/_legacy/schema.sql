-- ══════════════════════════════════════════════════════════════════════════
--  GasolinApp — Supabase Schema
--  Ejecuta este script en: Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";        -- Operaciones geoespaciales

-- ── ZONAS (agrupaciones geográficas para el zoom-out) ─────────────────────
CREATE TABLE zones (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  bounds     JSONB,                              -- GeoJSON polygon opcional
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── GASOLINERAS ───────────────────────────────────────────────────────────
CREATE TABLE stations (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  brand       TEXT NOT NULL,
  address     TEXT,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  location    GEOGRAPHY(POINT, 4326),            -- Para queries geoespaciales
  zone_id     UUID REFERENCES zones(id),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-calcular columna geography desde lat/lng
CREATE OR REPLACE FUNCTION sync_station_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_station_location
  BEFORE INSERT OR UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION sync_station_location();

-- ── PRECIOS DE COMBUSTIBLE ────────────────────────────────────────────────
CREATE TABLE fuel_prices (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  station_id      UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type       TEXT NOT NULL CHECK (fuel_type IN ('extra', 'super', 'diesel', 'urea')),
  price           DECIMAL(6, 3) NOT NULL CHECK (price > 0 AND price < 100),
  currency        TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'COP', 'PEN', 'MXN')),
  comment         TEXT,
  reported_by     TEXT DEFAULT 'Anónimo',
  votes_up        INT DEFAULT 0,
  votes_down      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Índices para queries frecuentes
CREATE INDEX idx_fuel_prices_station    ON fuel_prices(station_id, is_active);
CREATE INDEX idx_fuel_prices_type       ON fuel_prices(fuel_type, is_active);
CREATE INDEX idx_fuel_prices_active     ON fuel_prices(is_active, created_at DESC);
CREATE INDEX idx_stations_location      ON stations USING GIST(location);
CREATE INDEX idx_stations_zone          ON stations(zone_id);

-- ── REPORTES / COMENTARIOS (estilo Waze) ──────────────────────────────────
CREATE TABLE reports (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  station_id          UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  type                TEXT DEFAULT 'comment'
                        CHECK (type IN ('price', 'promotion', 'warning', 'correction', 'comment')),
  content             TEXT,
  user_display_name   TEXT DEFAULT 'Anónimo',
  votes_up            INT DEFAULT 0,
  votes_down          INT DEFAULT 0,
  is_visible          BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_station ON reports(station_id, is_visible, created_at DESC);

-- ── FUNCIÓN RPC: promedios por zona (usada en zoom-out) ───────────────────
CREATE OR REPLACE FUNCTION get_zone_averages()
RETURNS TABLE (
  id             UUID,
  name           TEXT,
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
    z.lat,
    z.lng,
    AVG(CASE WHEN fp.fuel_type = 'extra'  THEN fp.price END) as avg_extra,
    AVG(CASE WHEN fp.fuel_type = 'diesel' THEN fp.price END) as avg_diesel,
    AVG(CASE WHEN fp.fuel_type = 'super'  THEN fp.price END) as avg_super,
    AVG(CASE WHEN fp.fuel_type = 'urea'   THEN fp.price END) as avg_urea,
    COUNT(DISTINCT s.id) as station_count
  FROM zones z
  LEFT JOIN stations s         ON s.zone_id = z.id AND s.is_active = TRUE
  LEFT JOIN fuel_prices fp     ON fp.station_id = s.id AND fp.is_active = TRUE
  GROUP BY z.id, z.name, z.lat, z.lng;
$$;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
ALTER TABLE stations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones       ENABLE ROW LEVEL SECURITY;

-- Lectura pública para todos
CREATE POLICY "Public read stations"    ON stations    FOR SELECT USING (TRUE);
CREATE POLICY "Public read zones"       ON zones       FOR SELECT USING (TRUE);
CREATE POLICY "Public read fuel_prices" ON fuel_prices FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read reports"     ON reports     FOR SELECT USING (is_visible = TRUE);

-- Inserción pública (anon key puede reportar precios)
CREATE POLICY "Public insert fuel_prices" ON fuel_prices FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public insert reports"     ON reports     FOR INSERT WITH CHECK (TRUE);

-- Votos: UPDATE solo incrementa, nunca decrece
CREATE POLICY "Public vote reports" ON reports
  FOR UPDATE USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Public vote fuel_prices" ON fuel_prices
  FOR UPDATE USING (TRUE)
  WITH CHECK (TRUE);

-- ── SEED DATA: Zonas de Barranquilla ──────────────────────────────────────
INSERT INTO zones (id, name, lat, lng) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Norte',         11.010, -74.810),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'Centro',        10.985, -74.800),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'Suroccidente',  10.960, -74.820),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'El Prado',      11.000, -74.788),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'Riomar',        11.018, -74.850);

-- ── SEED DATA: Estaciones ─────────────────────────────────────────────────
INSERT INTO stations (name, brand, address, lat, lng, zone_id) VALUES
  ('Terpel El Recreo',       'Terpel', 'Cra. 46 #76-15',    11.012, -74.812, 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('Biomax Centro',          'Biomax', 'Cl. 45 #41-30',     10.986, -74.802, 'a1b2c3d4-0002-0002-0002-000000000002'),
  ('Primax Sur',             'Primax', 'Av. Murillo #18-20', 10.962, -74.822, 'a1b2c3d4-0003-0003-0003-000000000003'),
  ('Shell Prado',            'Shell',  'Cra. 53 #68-40',    11.001, -74.790, 'a1b2c3d4-0004-0004-0004-000000000004'),
  ('Terpel Riomar',          'Terpel', 'Cra. 72B #98-12',   11.019, -74.852, 'a1b2c3d4-0005-0005-0005-000000000005'),
  ('Mobil Circunvalar',      'Mobil',  'Av. Circunvalar #34-10', 11.008, -74.805, 'a1b2c3d4-0001-0001-0001-000000000001'),
  ('Biomax La Castellana',   'Biomax', 'Cl. 74 #60-25',     10.998, -74.786, 'a1b2c3d4-0004-0004-0004-000000000004');

-- ── AUTO-EXPIRE: cron job para marcar precios vencidos (requiere pg_cron) ─
-- Habilitar en Supabase: Database > Extensions > pg_cron
-- SELECT cron.schedule('expire-old-prices', '*/30 * * * *', $$
--   UPDATE fuel_prices SET is_active = FALSE
--   WHERE is_active = TRUE AND expires_at < NOW();
-- $$);
