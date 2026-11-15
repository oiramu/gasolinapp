-- S0.2 (Sprint 02): vigilancia de la fila SRID 4326 de PostGIS.
-- public.spatial_ref_sys es de supabase_admin y anon puede escribirla (ver Sprint 01, advisors);
-- no podemos quitarle ese permiso, así que la vigilamos a diario y dejamos lista la restauración.
-- Idempotente: se puede correr dos veces sin error.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ── Alertas operativas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ops_alerts (
  id         bigint      GENERATED ALWAYS AS IDENTITY,
  check_name text        NOT NULL,
  detail     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_alerts_pkey PRIMARY KEY (id)
);

-- Solo para operación: el cliente no la ve ni la toca
ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ops_alerts FROM anon, authenticated;

-- ── Valor esperado (fuente única) ─────────────────────────────────────────────
-- Fila 4326 de PostGIS 3.3.7 limpio; coincide con producción al 2026-11-15
-- (md5 srtext b15bafbdc1d2d38b9f1e31bd95f3082e, md5 proj4text 723f5f14abf4ef619865a2c068974932).
CREATE OR REPLACE FUNCTION public._expected_srid_4326()
RETURNS TABLE (auth_name varchar, auth_srid integer, srtext varchar, proj4text varchar)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT 'EPSG'::varchar, 4326,
         $srid$GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]$srid$::varchar,
         $srid$+proj=longlat +datum=WGS84 +no_defs $srid$::varchar
$fn$;

-- True si la fila 4326 existe y es idéntica a la esperada. Solo lee: el cliente puede llamarla.
CREATE OR REPLACE FUNCTION public.srid_4326_intact()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
      FROM spatial_ref_sys s, _expected_srid_4326() e
     WHERE s.srid = 4326
       AND s.auth_name = e.auth_name AND s.auth_srid = e.auth_srid
       AND s.srtext = e.srtext AND s.proj4text = e.proj4text)
$fn$;

-- Job diario: si la fila no está intacta, deja una alerta con lo que encontró.
CREATE OR REPLACE FUNCTION public.check_srid_4326()
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_ok boolean := srid_4326_intact();
BEGIN
  IF NOT v_ok THEN
    INSERT INTO ops_alerts (check_name, detail)
    SELECT 'srid_4326', coalesce(
      (SELECT jsonb_build_object('auth_name', s.auth_name, 'auth_srid', s.auth_srid,
                                 'md5_srtext', md5(s.srtext), 'md5_proj4text', md5(s.proj4text))
         FROM spatial_ref_sys s WHERE s.srid = 4326),
      jsonb_build_object('missing', true));
  END IF;
  RETURN v_ok;
END
$fn$;

-- Restauración (la llama supabase/rollbacks/restaurar_srid_4326.sql, como postgres).
CREATE OR REPLACE FUNCTION public.restore_srid_4326()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $fn$
  INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text)
  SELECT 4326, e.auth_name, e.auth_srid, e.srtext, e.proj4text FROM _expected_srid_4326() e
  ON CONFLICT (srid) DO UPDATE
    SET auth_name = EXCLUDED.auth_name, auth_srid = EXCLUDED.auth_srid,
        srtext = EXCLUDED.srtext, proj4text = EXCLUDED.proj4text
$fn$;

-- Privilegios explícitos (CLAUDE.md, regla 6)
REVOKE ALL ON FUNCTION public._expected_srid_4326(), public.check_srid_4326(), public.restore_srid_4326()
  FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.srid_4326_intact() FROM public;
GRANT EXECUTE ON FUNCTION public.srid_4326_intact() TO anon, authenticated;

-- ── Programación (06:00 en Bogotá = 11:00 UTC) ───────────────────────────────
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'check_srid_4326';
SELECT cron.schedule('check_srid_4326', '0 11 * * *', 'SELECT public.check_srid_4326()');
