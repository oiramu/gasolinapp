-- ════════════════════════════════════════════════════════════════════════════
-- Baseline — schema de producción reconstruido desde el catálogo (tarea 0.1)
--
-- Refleja producción (proyecto dynshsoyjojfkdqdlsoy) tal como estaba el
-- 2026-11-13, justo antes del hotfix 0.0 (20261113235634). En producción se
-- registra como aplicada sin ejecutarse; en local crea el schema desde cero.
--
-- Idempotente: IF NOT EXISTS, CREATE OR REPLACE y DROP ... IF EXISTS.
-- Los grants por defecto de Supabase sobre `public` (anon/authenticated) no se
-- declaran: los aplican los default privileges del proyecto.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Extensiones ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto    WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis     WITH SCHEMA public;

-- ── Tablas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zones (
  id         uuid             NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name       text             NOT NULL,
  lat        double precision NOT NULL,
  lng        double precision NOT NULL,
  bounds     jsonb,
  created_at timestamptz      DEFAULT now(),
  city       text,
  dept       text,
  code       text,
  CONSTRAINT zones_pkey        PRIMARY KEY (id),
  CONSTRAINT zones_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.stations (
  id                uuid                   NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name              text                   NOT NULL,
  brand             text                   NOT NULL,
  address           text,
  lat               double precision       NOT NULL,
  lng               double precision       NOT NULL,
  location          geography(Point, 4326),
  zone_id           uuid,
  is_active         boolean                DEFAULT true,
  created_at        timestamptz            DEFAULT now(),
  updated_at        timestamptz            DEFAULT now(),
  osm_id            text,
  has_gnv           boolean                NOT NULL DEFAULT false,
  svc_montallantas  boolean                DEFAULT false,
  svc_cambio_aceite boolean                DEFAULT false,
  svc_serviteca     boolean                DEFAULT false,
  svc_tienda        boolean                DEFAULT false,
  svc_lavadero      boolean                DEFAULT false,
  svc_bano          boolean                DEFAULT false,
  svc_cafe          boolean                DEFAULT false,
  svc_electrico     boolean                DEFAULT false,
  svc_atm           boolean                DEFAULT false,
  CONSTRAINT stations_pkey          PRIMARY KEY (id),
  CONSTRAINT stations_osm_id_unique UNIQUE (osm_id),
  CONSTRAINT stations_zone_id_fkey  FOREIGN KEY (zone_id) REFERENCES public.zones (id)
);

CREATE TABLE IF NOT EXISTS public.fuel_prices (
  id          uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
  station_id  uuid          NOT NULL,
  fuel_type   text          NOT NULL,
  price       numeric(10,2) NOT NULL,
  currency    text          DEFAULT 'USD',
  comment     text,
  reported_by text          DEFAULT 'Anónimo',
  votes_up    integer       DEFAULT 0,
  votes_down  integer       DEFAULT 0,
  is_active   boolean       DEFAULT true,
  created_at  timestamptz   DEFAULT now(),
  expires_at  timestamptz   DEFAULT (now() + '24:00:00'::interval),
  price_unit  varchar(10)   NOT NULL DEFAULT 'gallon',
  CONSTRAINT fuel_prices_pkey            PRIMARY KEY (id),
  CONSTRAINT fuel_prices_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations (id) ON DELETE CASCADE,
  CONSTRAINT fuel_prices_fuel_type_check CHECK (fuel_type = ANY (ARRAY['extra', 'corriente', 'diesel', 'urea', 'gnv'])),
  CONSTRAINT fuel_prices_price_check     CHECK (price > 0 AND price < 100000),
  CONSTRAINT fuel_prices_currency_check  CHECK (currency = ANY (ARRAY['USD', 'COP', 'PEN', 'MXN'])),
  CONSTRAINT fuel_prices_price_unit_check CHECK (price_unit::text = ANY (ARRAY['gallon', 'm3']))
);

CREATE TABLE IF NOT EXISTS public.reports (
  id                uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  station_id        uuid        NOT NULL,
  type              text        DEFAULT 'comment',
  content           text,
  user_display_name text        DEFAULT 'Anónimo',
  votes_up          integer     DEFAULT 0,
  votes_down        integer     DEFAULT 0,
  is_visible        boolean     DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT reports_pkey            PRIMARY KEY (id),
  CONSTRAINT reports_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations (id) ON DELETE CASCADE,
  CONSTRAINT reports_type_check      CHECK (type = ANY (ARRAY['price', 'promotion', 'warning', 'correction', 'comment']))
);

-- ── Índices ─────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS zones_code_unique       ON public.zones (code) WHERE code IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_stations_location   ON public.stations USING gist (location);
CREATE INDEX        IF NOT EXISTS idx_stations_zone       ON public.stations (zone_id);
CREATE INDEX        IF NOT EXISTS idx_stations_has_gnv    ON public.stations (has_gnv) WHERE has_gnv = true;
CREATE INDEX        IF NOT EXISTS idx_fuel_prices_station ON public.fuel_prices (station_id, is_active);
CREATE INDEX        IF NOT EXISTS idx_fuel_prices_type    ON public.fuel_prices (fuel_type, is_active);
CREATE INDEX        IF NOT EXISTS idx_fuel_prices_active  ON public.fuel_prices (is_active, created_at DESC);
CREATE INDEX        IF NOT EXISTS idx_reports_station     ON public.reports (station_id, is_visible, created_at DESC);

-- ── Vistas materializadas ───────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS public.latest_prices AS
  SELECT DISTINCT ON (station_id, fuel_type)
    station_id,
    fuel_type,
    price,
    price_unit,
    created_at AS reported_at,
    reported_by
  FROM public.fuel_prices
  WHERE is_active = true
  ORDER BY station_id, fuel_type, created_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_latest_prices_station_fuel ON public.latest_prices (station_id, fuel_type);
CREATE INDEX        IF NOT EXISTS idx_latest_prices_fuel_type    ON public.latest_prices (fuel_type);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_avg_prices AS
  SELECT
    station_id,
    fuel_type,
    date_trunc('day', created_at AT TIME ZONE 'America/Bogota') AS price_date,
    round(avg(price)) AS avg_price,
    min(price)        AS min_price,
    max(price)        AS max_price,
    count(*)          AS report_count
  FROM public.fuel_prices
  WHERE created_at >= now() - '90 days'::interval
  GROUP BY station_id, fuel_type, date_trunc('day', created_at AT TIME ZONE 'America/Bogota');

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_avg_unique ON public.daily_avg_prices (station_id, fuel_type, price_date);
CREATE INDEX        IF NOT EXISTS idx_daily_avg_lookup ON public.daily_avg_prices (station_id, fuel_type, price_date DESC);

-- ── Vista de depuración ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_station_summary AS
  SELECT
    s.id,
    s.name,
    s.brand,
    s.address,
    s.lat,
    s.lng,
    z.name AS zone_name,
    z.city AS zone_city,
    z.dept AS zone_dept,
    count(fp.id)       FILTER (WHERE fp.is_active) AS active_prices,
    max(fp.created_at) FILTER (WHERE fp.is_active) AS last_report
  FROM public.stations s
  LEFT JOIN public.zones z        ON z.id = s.zone_id
  LEFT JOIN public.fuel_prices fp ON fp.station_id = s.id
  WHERE s.is_active = true
  GROUP BY s.id, s.name, s.brand, s.address, s.lat, s.lng, z.name, z.city, z.dept
  ORDER BY z.name, s.name;

-- ── Funciones ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_station_location()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_station_has_gnv()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.fuel_type = 'gnv' THEN
    UPDATE stations
    SET has_gnv = true
    WHERE id = NEW.station_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_latest_prices()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY latest_prices;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_daily_avg_prices()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_avg_prices;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_zone_averages()
  RETURNS TABLE(
    id uuid, name text, city text, dept text, code text,
    lat double precision, lng double precision,
    avg_extra double precision, avg_diesel double precision, avg_corriente double precision,
    avg_urea double precision, avg_gnv double precision,
    station_count bigint
  )
  LANGUAGE sql
  SECURITY DEFINER
AS $function$
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
$function$;

-- ── Triggers ────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_sync_station_location
  BEFORE INSERT OR UPDATE ON public.stations
  FOR EACH ROW EXECUTE FUNCTION public.sync_station_location();

CREATE OR REPLACE TRIGGER trg_mark_station_has_gnv
  AFTER INSERT ON public.fuel_prices
  FOR EACH ROW EXECUTE FUNCTION public.mark_station_has_gnv();

CREATE OR REPLACE TRIGGER trg_refresh_latest_prices
  AFTER INSERT ON public.fuel_prices
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_latest_prices();

CREATE OR REPLACE TRIGGER trg_refresh_daily_avg
  AFTER INSERT ON public.fuel_prices
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_daily_avg_prices();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.zones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read zones" ON public.zones;
CREATE POLICY "Public read zones" ON public.zones
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read stations" ON public.stations;
CREATE POLICY "Public read stations" ON public.stations
  FOR SELECT USING (true);

-- Estado histórico: la elimina el hotfix 0.0 (20261113235634)
DROP POLICY IF EXISTS "Public update stations" ON public.stations;
CREATE POLICY "Public update stations" ON public.stations
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read fuel_prices" ON public.fuel_prices;
CREATE POLICY "Public read fuel_prices" ON public.fuel_prices
  FOR SELECT USING (is_active = true);

-- Estado histórico: las cierra la tarea 1.3
DROP POLICY IF EXISTS "Public insert fuel_prices" ON public.fuel_prices;
CREATE POLICY "Public insert fuel_prices" ON public.fuel_prices
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public vote fuel_prices" ON public.fuel_prices;
CREATE POLICY "Public vote fuel_prices" ON public.fuel_prices
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read reports" ON public.reports;
CREATE POLICY "Public read reports" ON public.reports
  FOR SELECT USING (is_visible = true);

DROP POLICY IF EXISTS "Public insert reports" ON public.reports;
CREATE POLICY "Public insert reports" ON public.reports
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public vote reports" ON public.reports;
CREATE POLICY "Public vote reports" ON public.reports
  FOR UPDATE USING (true) WITH CHECK (true);
