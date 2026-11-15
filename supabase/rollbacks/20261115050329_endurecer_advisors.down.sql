-- Rollback de 20261115050329_endurecer_advisors.sql. NO está en supabase/migrations: no se aplica solo.
-- Uso (solo si el endurecimiento rompe algo): copiarlo a una migración nueva, revisarlo y aplicarlo.
-- Devuelve el estado de la baseline: funciones heredadas ejecutables por el cliente, search_path sin fijar,
-- vista como SECURITY DEFINER y privilegios por defecto abiertos. Idempotente.

GRANT EXECUTE ON FUNCTION public.refresh_latest_prices(), public.refresh_daily_avg_prices(),
                          public.mark_station_has_gnv(), public.sync_station_location()
  TO public, anon, authenticated;

ALTER FUNCTION public.refresh_latest_prices()    RESET search_path;
ALTER FUNCTION public.refresh_daily_avg_prices() RESET search_path;
ALTER FUNCTION public.sync_station_location()    RESET search_path;
ALTER FUNCTION public.get_zone_averages()        RESET search_path;
-- mark_station_has_gnv conserva su search_path: lo fijó el hotfix 0.0, no esta migración.

ALTER VIEW public.v_station_summary RESET (security_invoker);

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
