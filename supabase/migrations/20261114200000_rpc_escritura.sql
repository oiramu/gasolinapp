-- 1.3a Expandir: RPCs de escritura para precios, reportes y sugerencias de servicios.
-- Las políticas públicas de INSERT/UPDATE siguen vivas hasta la 1.3c (el frontend viejo las usa).
-- Idempotente: se puede correr dos veces sin error ni duplicados.

-- ── Rangos de precio por combustible ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fuel_price_ranges (
  fuel_type  text        NOT NULL,
  min_price  integer     NOT NULL,
  max_price  integer     NOT NULL,
  price_unit varchar(10) NOT NULL,
  CONSTRAINT fuel_price_ranges_pkey       PRIMARY KEY (fuel_type),
  CONSTRAINT fuel_price_ranges_bounds     CHECK (min_price > 0 AND min_price < max_price),
  CONSTRAINT fuel_price_ranges_unit_check CHECK (price_unit IN ('gallon', 'm3'))
);

-- Valores de src/shared/domain/fuel.ts (FUEL_PRICE_RANGES y FUEL_TYPES[].unit).
-- supabase/tests/database/003_fuel_price_ranges.test.sql se genera desde fuel.ts y verifica que coincidan.
INSERT INTO public.fuel_price_ranges (fuel_type, min_price, max_price, price_unit) VALUES
  ('corriente', 12000, 20000, 'gallon'),
  ('extra',     13000, 25000, 'gallon'),
  ('diesel',     9000, 19000, 'gallon'),
  ('urea',       2000, 10000, 'gallon'),
  ('gnv',        1500,  5000, 'm3')
ON CONFLICT (fuel_type) DO UPDATE
  SET min_price = EXCLUDED.min_price, max_price = EXCLUDED.max_price, price_unit = EXCLUDED.price_unit;

ALTER TABLE public.fuel_price_ranges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read fuel_price_ranges" ON public.fuel_price_ranges;
CREATE POLICY "Public read fuel_price_ranges" ON public.fuel_price_ranges
  FOR SELECT USING (true);

REVOKE ALL ON public.fuel_price_ranges FROM anon, authenticated;
GRANT SELECT ON public.fuel_price_ranges TO anon, authenticated;

-- ── Autor de cada escritura ───────────────────────────────────────────────────
ALTER TABLE public.fuel_prices ADD COLUMN IF NOT EXISTS reporter_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.reports     ADD COLUMN IF NOT EXISTS reporter_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

-- Sirven a los límites de tasa (escrituras recientes de un usuario)
CREATE INDEX IF NOT EXISTS idx_fuel_prices_reporter ON public.fuel_prices (reporter_id, created_at DESC) WHERE reporter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_reporter     ON public.reports (reporter_id, created_at DESC)     WHERE reporter_id IS NOT NULL;

-- ── Sugerencias de servicios ──────────────────────────────────────────────────
-- Una sugerencia vigente por usuario y estación: si cambia de opinión, se reemplaza.
CREATE TABLE IF NOT EXISTS public.service_suggestions (
  station_id uuid        NOT NULL,
  voter_id   uuid        NOT NULL,
  services   jsonb       NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_suggestions_pkey            PRIMARY KEY (station_id, voter_id),
  CONSTRAINT service_suggestions_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations (id) ON DELETE CASCADE,
  CONSTRAINT service_suggestions_voter_id_fkey   FOREIGN KEY (voter_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT service_suggestions_object          CHECK (jsonb_typeof(services) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_service_suggestions_voter ON public.service_suggestions (voter_id, created_at DESC);

-- Sin políticas: el cliente no lee ni escribe; solo la RPC
ALTER TABLE public.service_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_suggestions FROM anon, authenticated;

-- ── Helpers internos (no expuestos) ───────────────────────────────────────────

-- Uid de la sesión. Serializa las escrituras del mismo usuario para que los límites de tasa no tengan carreras.
CREATE OR REPLACE FUNCTION public._writer_uid()
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  RETURN v_uid;
END
$$;

CREATE OR REPLACE FUNCTION public._require_active_station(p_station_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM stations WHERE id = p_station_id AND is_active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
END
$$;

-- PT429: PostgREST responde HTTP 429 (Too Many Requests)
CREATE OR REPLACE FUNCTION public._check_rate_limit(p_recent bigint, p_max integer)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_recent >= p_max THEN
    RAISE EXCEPTION 'RATE_LIMIT' USING ERRCODE = 'PT429';
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public._writer_uid()                       FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._require_active_station(uuid)       FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._check_rate_limit(bigint, integer)  FROM public, anon, authenticated;

-- ── RPC: reportar un precio ───────────────────────────────────────────────────
-- Precio en COP enteros. La unidad y la moneda las fija el servidor; la identidad sale de la sesión.
-- Un segundo reporte del mismo usuario, estación y combustible en 30 min corrige el primero.
CREATE OR REPLACE FUNCTION public.report_price(p_station_id uuid, p_fuel_type text, p_price integer, p_comment text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_per_hour  constant integer  := 10;
  c_rate_window   constant interval := interval '1 hour';
  c_dedupe_window constant interval := interval '30 minutes';
  c_max_comment   constant integer  := 280;
  v_uid     uuid := _writer_uid();
  v_range   fuel_price_ranges;
  v_comment text := NULLIF(btrim(p_comment), '');
  v_id      uuid;
BEGIN
  SELECT * INTO v_range FROM fuel_price_ranges WHERE fuel_type = p_fuel_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_FUEL' USING ERRCODE = '22023';
  END IF;
  IF p_price IS NULL OR p_price NOT BETWEEN v_range.min_price AND v_range.max_price THEN
    RAISE EXCEPTION 'OUT_OF_RANGE' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_comment) > c_max_comment THEN
    RAISE EXCEPTION 'INVALID_COMMENT' USING ERRCODE = '22023';
  END IF;
  PERFORM _require_active_station(p_station_id);

  UPDATE fuel_prices
     SET price = p_price, comment = v_comment, created_at = now(), expires_at = DEFAULT
   WHERE id = (
     SELECT p.id FROM fuel_prices p
      WHERE p.reporter_id = v_uid AND p.station_id = p_station_id AND p.fuel_type = p_fuel_type
        AND p.is_active IS TRUE AND p.created_at > now() - c_dedupe_window
      ORDER BY p.created_at DESC
      LIMIT 1)
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  PERFORM _check_rate_limit(
    (SELECT count(*) FROM fuel_prices p WHERE p.reporter_id = v_uid AND p.created_at > now() - c_rate_window),
    c_max_per_hour);

  INSERT INTO fuel_prices (station_id, fuel_type, price, price_unit, currency, comment, reported_by, reporter_id, is_active)
  VALUES (p_station_id, p_fuel_type, p_price, v_range.price_unit, 'COP', v_comment, 'Anónimo', v_uid, true)
  RETURNING id INTO v_id;
  RETURN v_id;
END
$$;

-- ── RPC: agregar un reporte de la comunidad ───────────────────────────────────
-- Los tipos válidos los define el CHECK reports_type_check (una sola fuente).
CREATE OR REPLACE FUNCTION public.add_report(p_station_id uuid, p_type text, p_content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_per_hour constant integer  := 5;
  c_rate_window  constant interval := interval '1 hour';
  c_max_content  constant integer  := 280;
  v_uid     uuid := _writer_uid();
  v_content text := btrim(p_content);
  v_id      uuid;
BEGIN
  IF p_type IS NULL THEN
    RAISE EXCEPTION 'INVALID_TYPE' USING ERRCODE = '22023';
  END IF;
  IF coalesce(char_length(v_content), 0) NOT BETWEEN 1 AND c_max_content THEN
    RAISE EXCEPTION 'INVALID_CONTENT' USING ERRCODE = '22023';
  END IF;
  PERFORM _require_active_station(p_station_id);
  PERFORM _check_rate_limit(
    (SELECT count(*) FROM reports r WHERE r.reporter_id = v_uid AND r.created_at > now() - c_rate_window),
    c_max_per_hour);

  BEGIN
    INSERT INTO reports (station_id, type, content, user_display_name, reporter_id)
    VALUES (p_station_id, p_type, v_content, 'Anónimo', v_uid)
    RETURNING id INTO v_id;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'INVALID_TYPE' USING ERRCODE = '22023';
  END;
  RETURN v_id;
END
$$;

-- ── RPC: sugerir servicios de una estación ────────────────────────────────────
-- Solo claves svc_* que existen como columnas booleanas de stations (el catálogo es la fuente).
-- Una clave se aplica a la estación cuando 2 usuarios distintos coinciden en su valor en 30 días.
-- Devuelve las claves que cambiaron en la estación.
CREATE OR REPLACE FUNCTION public.suggest_station_services(p_station_id uuid, p_services jsonb)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_per_hour     constant integer  := 10;
  c_rate_window      constant interval := interval '1 hour';
  c_agreement_window constant interval := interval '30 days';
  c_quorum           constant integer  := 2;
  v_uid     uuid := _writer_uid();
  v_known   text[];
  v_key     text;
  v_value   jsonb;
  v_changed integer;
  v_applied text[] := ARRAY[]::text[];
BEGIN
  SELECT array_agg(c.column_name::text) INTO v_known
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'stations'
     AND c.column_name LIKE 'svc\_%' AND c.data_type = 'boolean';

  IF p_services IS NULL OR jsonb_typeof(p_services) <> 'object' OR p_services = '{}'::jsonb
     OR EXISTS (SELECT 1 FROM jsonb_each(p_services) e
                 WHERE NOT (e.key = ANY (v_known)) OR jsonb_typeof(e.value) <> 'boolean') THEN
    RAISE EXCEPTION 'INVALID_SERVICES' USING ERRCODE = '22023';
  END IF;
  PERFORM _require_active_station(p_station_id);
  PERFORM _check_rate_limit(
    (SELECT count(*) FROM service_suggestions s WHERE s.voter_id = v_uid AND s.created_at > now() - c_rate_window),
    c_max_per_hour);

  INSERT INTO service_suggestions AS s (station_id, voter_id, services)
  VALUES (p_station_id, v_uid, p_services)
  ON CONFLICT ON CONSTRAINT service_suggestions_pkey
    DO UPDATE SET services = EXCLUDED.services, created_at = now();

  FOR v_key, v_value IN SELECT e.key, e.value FROM jsonb_each(p_services) e LOOP
    CONTINUE WHEN (
      SELECT count(*) FROM service_suggestions s
       WHERE s.station_id = p_station_id AND s.created_at > now() - c_agreement_window AND s.services -> v_key = v_value
    ) < c_quorum;

    -- v_key está en v_known (columnas reales de stations); %I la cita como identificador
    EXECUTE format('UPDATE stations SET %I = $1, updated_at = now() WHERE id = $2 AND %I IS DISTINCT FROM $1', v_key, v_key)
      USING (v_value #>> '{}')::boolean, p_station_id;
    GET DIAGNOSTICS v_changed = ROW_COUNT;
    IF v_changed > 0 THEN
      v_applied := v_applied || v_key;
    END IF;
  END LOOP;

  RETURN v_applied;
END
$$;

REVOKE ALL ON FUNCTION public.report_price(uuid, text, integer, text)       FROM public;
REVOKE ALL ON FUNCTION public.add_report(uuid, text, text)                  FROM public;
REVOKE ALL ON FUNCTION public.suggest_station_services(uuid, jsonb)         FROM public;
GRANT EXECUTE ON FUNCTION public.report_price(uuid, text, integer, text)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_report(uuid, text, text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_station_services(uuid, jsonb)      TO anon, authenticated;
