-- 1.4 Prueba de ataque: estaciones de prueba ocultas y limpieza de lo que escribe el script.
-- Idempotente: se puede correr dos veces sin error ni duplicados.

ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Tres estaciones (15 combinaciones estación × combustible) para pasar el límite de 10 precios por hora
-- sin chocar con la corrección de 30 min. Sin zona: no entran en los promedios por zona.
INSERT INTO public.stations (id, name, brand, lat, lng, is_active, is_test) VALUES
  ('00000000-0000-4000-a000-00000000e501', 'EDS de prueba 1 (security-check)', 'Prueba', 0.001, 0.001, true, true),
  ('00000000-0000-4000-a000-00000000e502', 'EDS de prueba 2 (security-check)', 'Prueba', 0.002, 0.002, true, true),
  ('00000000-0000-4000-a000-00000000e503', 'EDS de prueba 3 (security-check)', 'Prueba', 0.003, 0.003, true, true)
ON CONFLICT (id) DO UPDATE SET is_test = true, is_active = true;

-- El REVOKE de la 1.3c deja al cliente sin escribir columnas nuevas; is_test solo se lee.

-- ── RPC: limpiar mis datos de prueba ──────────────────────────────────────────
-- Borra solo lo que la sesión escribió en estaciones de prueba (no es una puerta administrativa).
-- Devuelve cuántas filas borró.
CREATE OR REPLACE FUNCTION public.clear_my_test_data()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_deleted integer := 0;
  v_rows    integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  DELETE FROM votes v
   WHERE v.voter_id = v_uid
     AND (   v.target_id IN (SELECT r.id FROM reports r JOIN stations s ON s.id = r.station_id WHERE s.is_test)
          OR v.target_id IN (SELECT p.id FROM fuel_prices p JOIN stations s ON s.id = p.station_id WHERE s.is_test));
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_deleted := v_deleted + v_rows;

  DELETE FROM reports r USING stations s
   WHERE s.id = r.station_id AND s.is_test AND r.reporter_id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_deleted := v_deleted + v_rows;

  DELETE FROM fuel_prices p USING stations s
   WHERE s.id = p.station_id AND s.is_test AND p.reporter_id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_deleted := v_deleted + v_rows;

  DELETE FROM service_suggestions g USING stations s
   WHERE s.id = g.station_id AND s.is_test AND g.voter_id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_deleted + v_rows;
END
$$;

REVOKE ALL ON FUNCTION public.clear_my_test_data() FROM public;
GRANT EXECUTE ON FUNCTION public.clear_my_test_data() TO anon, authenticated;
