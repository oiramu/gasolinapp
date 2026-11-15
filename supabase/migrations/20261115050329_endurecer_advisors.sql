-- Endurecer lo que marcan los advisors de seguridad de Supabase (heredado de la baseline).
-- Idempotente: se puede correr dos veces sin error.

-- ── Funciones de trigger y de refresco ────────────────────────────────────────
-- Las llaman los triggers de stations y fuel_prices; el cliente no tiene por qué llamarlas
-- (refrescar las vistas materializadas a pedido serviría para saturar la base).
-- Un trigger no exige EXECUTE al rol que escribe, así que los reportes siguen funcionando.
REVOKE EXECUTE ON FUNCTION public.refresh_latest_prices(), public.refresh_daily_avg_prices(),
                           public.mark_station_has_gnv(), public.sync_station_location()
  FROM public, anon, authenticated;

-- ── search_path fijo ──────────────────────────────────────────────────────────
ALTER FUNCTION public.refresh_latest_prices()    SET search_path = public;
ALTER FUNCTION public.refresh_daily_avg_prices() SET search_path = public;
ALTER FUNCTION public.sync_station_location()    SET search_path = public;
ALTER FUNCTION public.get_zone_averages()        SET search_path = public;

-- ── Vista resumen ─────────────────────────────────────────────────────────────
-- Con security_invoker, la vista aplica la RLS de quien consulta (antes se la saltaba).
ALTER VIEW public.v_station_summary SET (security_invoker = true);

-- PostGIS: public.spatial_ref_sys queda fuera. Sus privilegios los otorgó supabase_admin y
-- postgres no puede revocarlos (REVOKE solo da advertencias). Ver docs/sprints/01-seguridad.md.

-- ── Privilegios por defecto ───────────────────────────────────────────────────
-- Lo que postgres cree desde ahora nace cerrado para el cliente: las tablas solo con SELECT
-- y las funciones sin EXECUTE hasta un GRANT explícito (como ya hace cada migración).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
-- El EXECUTE de PUBLIC viene del default global: un REVOKE por esquema no lo quita.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
