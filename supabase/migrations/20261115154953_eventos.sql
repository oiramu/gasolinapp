-- 3.4 "Medir desde el día uno": eventos de producto, anónimos (solo el uid de la sesión).
-- Lista cerrada de nombres = enum `event_name` (TS la lee de los tipos generados: una sola fuente).
-- Props: objeto JSON de máximo 1 KB (CHECK de la tabla, que la RPC traduce a INVALID_PROPS).
-- Solo se escribe por la RPC `track`; el cliente no lee ni escribe la tabla.
-- Idempotente: se puede correr dos veces sin error.

DO $$
BEGIN
  CREATE TYPE public.event_name AS ENUM ('app_open', 'station_open', 'price_reported', 'price_confirmed', 'vote', 'share');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.events (
  id         bigint            GENERATED ALWAYS AS IDENTITY,
  name       public.event_name NOT NULL,
  props      jsonb             NOT NULL DEFAULT '{}'::jsonb,
  user_id    uuid              NOT NULL,
  created_at timestamptz       NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey            PRIMARY KEY (id),
  CONSTRAINT events_user_id_fkey    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT events_props_is_object CHECK (jsonb_typeof(props) = 'object'),
  CONSTRAINT events_props_max_1kb   CHECK (octet_length(props::text) <= 1024)
);

-- Límite de tasa (eventos recientes del usuario) y métricas por nombre y fecha
CREATE INDEX IF NOT EXISTS idx_events_user_created ON public.events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON public.events (name, created_at DESC);

-- Sin políticas: el cliente no la lee ni la escribe; solo la RPC
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM anon, authenticated;

-- ── RPC: registrar un evento ──────────────────────────────────────────────────
-- Sesión obligatoria (el uid anónimo es la única identidad). Hasta 300 eventos por usuario por hora.
CREATE OR REPLACE FUNCTION public.track(p_name text, p_props jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_per_hour constant integer  := 300;
  c_rate_window  constant interval := interval '1 hour';
  v_uid          uuid := _writer_uid();
  v_name         event_name;
BEGIN
  BEGIN
    v_name := p_name::event_name;
  EXCEPTION WHEN invalid_text_representation THEN
    v_name := NULL;
  END;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'INVALID_EVENT' USING ERRCODE = '22023';
  END IF;

  PERFORM _check_rate_limit(
    (SELECT count(*) FROM events e WHERE e.user_id = v_uid AND e.created_at > now() - c_rate_window),
    c_max_per_hour);

  INSERT INTO events (name, props, user_id) VALUES (v_name, coalesce(p_props, '{}'::jsonb), v_uid);
EXCEPTION WHEN check_violation THEN
  RAISE EXCEPTION 'INVALID_PROPS' USING ERRCODE = '22023';
END
$$;

-- Privilegios explícitos (CLAUDE.md, regla 6)
REVOKE ALL ON FUNCTION public.track(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.track(text, jsonb) TO anon, authenticated;
