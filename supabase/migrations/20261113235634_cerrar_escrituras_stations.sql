-- ════════════════════════════════════════════════════════════════════════════
-- Hotfix 0.0 — Cerrar escrituras públicas sobre `stations`
--
-- Aplicada en producción el 2026-11-13 vía MCP (apply_migration).
-- Idempotente. La edición de servicios vuelve en la tarea 1.3 vía RPC.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. RLS activo (sin RLS las políticas no protegen nada)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODA política de escritura, sin depender de su nombre
DO $$
DECLARE
  _policy record;
BEGIN
  FOR _policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'stations'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stations', _policy.policyname);
  END LOOP;
END
$$;

-- 3. Sin privilegio de escritura para el cliente: el intento falla con
--    "permission denied" en vez de afectar 0 filas en silencio
REVOKE INSERT, UPDATE, DELETE ON public.stations FROM anon, authenticated;

-- 4. Endurecer la única función SECURITY DEFINER que escribe en stations
ALTER FUNCTION public.mark_station_has_gnv() SET search_path = public;
