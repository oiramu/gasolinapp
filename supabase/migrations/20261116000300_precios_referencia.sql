-- 2.2 Precios oficiales de referencia (MinEnergía/CREG) por ciudad y combustible.
-- Se cargan cada mes con scripts/import-reference-prices.ts (Mario aplica el SQL generado).
-- Idempotente: se puede correr dos veces sin error.

CREATE TABLE IF NOT EXISTS public.reference_prices (
  city       text        NOT NULL,
  fuel_type  text        NOT NULL,
  valid_from date        NOT NULL,
  price      integer     NOT NULL,
  source_url text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reference_prices_pkey           PRIMARY KEY (city, fuel_type, valid_from),
  -- Solo combustibles conocidos (la misma tabla que valida report_price)
  CONSTRAINT reference_prices_fuel_type_fkey FOREIGN KEY (fuel_type) REFERENCES public.fuel_price_ranges (fuel_type),
  CONSTRAINT reference_prices_source_https   CHECK (source_url LIKE 'https://%'),
  CONSTRAINT reference_prices_city_trimmed   CHECK (city = btrim(city) AND city <> '')
);

-- Combustible conocido y precio dentro de su rango (fuel_price_ranges, generado desde fuel.ts).
-- Mismos códigos que report_price: INVALID_FUEL y OUT_OF_RANGE.
CREATE OR REPLACE FUNCTION public._check_reference_price_range()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_range fuel_price_ranges;
BEGIN
  SELECT * INTO v_range FROM fuel_price_ranges WHERE fuel_type = NEW.fuel_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_FUEL' USING ERRCODE = '22023';
  END IF;
  IF NEW.price NOT BETWEEN v_range.min_price AND v_range.max_price THEN
    RAISE EXCEPTION 'OUT_OF_RANGE' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_reference_price_range ON public.reference_prices;
CREATE TRIGGER trg_reference_price_range
  BEFORE INSERT OR UPDATE ON public.reference_prices
  FOR EACH ROW EXECUTE FUNCTION public._check_reference_price_range();

-- Precio vigente hoy (hora de Bogotá) por ciudad y combustible
CREATE OR REPLACE VIEW public.current_reference_prices
WITH (security_invoker = true) AS
  SELECT DISTINCT ON (city, fuel_type) city, fuel_type, valid_from, price, source_url
    FROM public.reference_prices
   WHERE valid_from <= (now() AT TIME ZONE 'America/Bogota')::date
   ORDER BY city, fuel_type, valid_from DESC;

-- Lectura pública; escritura solo desde el SQL de importación (postgres)
ALTER TABLE public.reference_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read reference_prices" ON public.reference_prices;
CREATE POLICY "Public read reference_prices" ON public.reference_prices
  FOR SELECT USING (true);

-- Privilegios explícitos (CLAUDE.md, regla 6)
REVOKE ALL ON public.reference_prices, public.current_reference_prices FROM anon, authenticated;
GRANT SELECT ON public.reference_prices, public.current_reference_prices TO anon, authenticated;
REVOKE ALL ON FUNCTION public._check_reference_price_range() FROM public, anon, authenticated;

-- ── Recordatorio mensual (no carga datos) ─────────────────────────────────────
-- La carga es manual (npm run reference-prices:import + SQL Editor) porque los precios se validan
-- contra la fuente antes de aplicarlos. Este job solo avisa si el mes empezó sin precios oficiales.
CREATE OR REPLACE FUNCTION public.check_reference_prices_current()
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_month date := date_trunc('month', now() AT TIME ZONE 'America/Bogota')::date;
  v_ok    boolean;
BEGIN
  v_ok := EXISTS (SELECT 1 FROM reference_prices WHERE valid_from >= v_month);
  IF NOT v_ok THEN
    INSERT INTO ops_alerts (check_name, detail)
    VALUES ('reference_prices', jsonb_build_object('month', v_month, 'action', 'npm run reference-prices:import'));
  END IF;
  RETURN v_ok;
END
$$;

REVOKE ALL ON FUNCTION public.check_reference_prices_current() FROM public, anon, authenticated;

-- Día 2 de cada mes a las 06:00 de Bogotá (11:00 UTC): la resolución suele publicarse el último día hábil
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'check_reference_prices';
SELECT cron.schedule('check_reference_prices', '0 11 2 * *', 'SELECT public.check_reference_prices_current()');
