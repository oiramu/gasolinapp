-- 3.1 "¿Sigue en $X?": confirmar un precio comunitario renueva su confirmed_at.
-- Una confirmación por usuario, precio y día (hora de Bogotá). Solo por RPC.
-- Idempotente: se puede correr dos veces sin error.

CREATE TABLE IF NOT EXISTS public.price_confirmations (
  price_id     uuid        NOT NULL,
  voter_id     uuid        NOT NULL,
  confirmed_on date        NOT NULL DEFAULT (now() AT TIME ZONE 'America/Bogota')::date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_confirmations_pkey          PRIMARY KEY (price_id, voter_id, confirmed_on),
  CONSTRAINT price_confirmations_price_id_fkey FOREIGN KEY (price_id) REFERENCES public.fuel_prices (id) ON DELETE CASCADE,
  CONSTRAINT price_confirmations_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Para el límite de tasa (escrituras recientes del usuario)
CREATE INDEX IF NOT EXISTS idx_price_confirmations_voter ON public.price_confirmations (voter_id, created_at DESC);

-- Sin políticas: el cliente no la lee ni la escribe; solo la RPC
ALTER TABLE public.price_confirmations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.price_confirmations FROM anon, authenticated;

-- ── RPC: confirmar un precio ──────────────────────────────────────────────────
-- Devuelve el confirmed_at nuevo. Cuenta para el mismo límite que reportar: 10 escrituras
-- (reportes de precio + confirmaciones) por usuario por hora.
CREATE OR REPLACE FUNCTION public.confirm_price(p_price_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_per_hour constant integer  := 10;
  c_rate_window  constant interval := interval '1 hour';
  v_uid          uuid := _writer_uid();
  v_today        date := (now() AT TIME ZONE 'America/Bogota')::date;
  v_confirmed_at timestamptz;
BEGIN
  PERFORM 1 FROM fuel_prices p
    JOIN stations s ON s.id = p.station_id
   WHERE p.id = p_price_id AND p.is_active IS TRUE AND s.is_active IS TRUE
     FOR UPDATE OF p;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRICE_NOT_FOUND' USING ERRCODE = 'PT404';
  END IF;

  IF EXISTS (SELECT 1 FROM price_confirmations c WHERE c.price_id = p_price_id AND c.voter_id = v_uid AND c.confirmed_on = v_today) THEN
    RAISE EXCEPTION 'ALREADY_CONFIRMED' USING ERRCODE = 'PT409';
  END IF;

  PERFORM _check_rate_limit(
    (SELECT count(*) FROM fuel_prices p WHERE p.reporter_id = v_uid AND p.created_at > now() - c_rate_window)
    + (SELECT count(*) FROM price_confirmations c WHERE c.voter_id = v_uid AND c.created_at > now() - c_rate_window),
    c_max_per_hour);

  INSERT INTO price_confirmations (price_id, voter_id, confirmed_on) VALUES (p_price_id, v_uid, v_today);

  UPDATE fuel_prices SET confirmed_at = now() WHERE id = p_price_id
  RETURNING confirmed_at INTO v_confirmed_at;
  RETURN v_confirmed_at;
END
$$;

-- Privilegios explícitos (CLAUDE.md, regla 6)
REVOKE ALL ON FUNCTION public.confirm_price(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.confirm_price(uuid) TO anon, authenticated;
