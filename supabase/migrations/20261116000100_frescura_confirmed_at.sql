-- 2.1 Frescura (expandir): confirmed_at reemplaza al vencimiento a 24 h.
-- El precio no vence: envejece. Su frescura se calcula en el cliente desde confirmed_at
-- (shared/domain/freshness.ts). expires_at se elimina en 20261116000200_quitar_expires_at.
-- Idempotente: se puede correr dos veces sin error.

ALTER TABLE public.fuel_prices ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Backfill: hasta hoy, la última confirmación de un precio es cuando se reportó
UPDATE public.fuel_prices SET confirmed_at = coalesce(created_at, now()) WHERE confirmed_at IS NULL;

ALTER TABLE public.fuel_prices ALTER COLUMN confirmed_at SET DEFAULT now();
ALTER TABLE public.fuel_prices ALTER COLUMN confirmed_at SET NOT NULL;

-- Sirve a la métrica norte y a "¿Sigue en $X?" (3.1): precio más reciente confirmado por estación y combustible
CREATE INDEX IF NOT EXISTS idx_fuel_prices_confirmed ON public.fuel_prices (station_id, fuel_type, confirmed_at DESC) WHERE is_active;

-- report_price llena confirmed_at (al reportar y al corregir en 30 min) y deja de tocar expires_at.
-- Mismo cuerpo que en 20261115044942_rpc_escritura salvo esas dos líneas.
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
     SET price = p_price, comment = v_comment, created_at = now(), confirmed_at = now()
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

  INSERT INTO fuel_prices (station_id, fuel_type, price, price_unit, currency, comment, reported_by, reporter_id, is_active, confirmed_at)
  VALUES (p_station_id, p_fuel_type, p_price, v_range.price_unit, 'COP', v_comment, 'Anónimo', v_uid, true, now())
  RETURNING id INTO v_id;
  RETURN v_id;
END
$$;

-- Privilegios explícitos (CLAUDE.md, regla 6); CREATE OR REPLACE los conserva, se reafirman
REVOKE ALL ON FUNCTION public.report_price(uuid, text, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.report_price(uuid, text, integer, text) TO anon, authenticated;
