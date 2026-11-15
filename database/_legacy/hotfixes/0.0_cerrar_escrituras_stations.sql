-- ════════════════════════════════════════════════════════════════════════════
-- Hotfix 0.0 — Cerrar escrituras públicas sobre `stations`
--
-- Problema: "Public update stations" (FOR UPDATE USING TRUE) permite que
-- cualquiera con la anon key renombre, mueva o desactive estaciones.
--
-- Idempotente: se puede correr varias veces sin error ni efectos extra.
-- Aplicar en Supabase → SQL Editor. Las escrituras legítimas (seed con
-- service_role y triggers SECURITY DEFINER) no se ven afectadas.
-- La edición de servicios vuelve en la tarea 1.3 vía RPC.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

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

COMMIT;

-- ── Verificación (solo lectura) ──────────────────────────────────────────────

-- a) Debe devolver solo políticas SELECT
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stations';

-- b) Debe devolver rls_enabled = true
SELECT relrowsecurity AS rls_enabled
FROM pg_class
WHERE oid = 'public.stations'::regclass;

-- c) Debe devolver solo SELECT (y REFERENCES/TRIGGER/TRUNCATE si existían) para anon y authenticated;
--    nunca INSERT, UPDATE ni DELETE
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name   = 'stations'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- d) Debe devolver search_path=public
SELECT proconfig
FROM pg_proc
WHERE oid = 'public.mark_station_has_gnv()'::regprocedure;
