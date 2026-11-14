-- ── IDEMPOTENT PUBLIC UPDATE POLICY FOR STATIONS ───────────────────────────
-- Permite que usuarios anónimos actualicen la información de la estación (svc_*).
-- Se usa un bloque DO para evitar errores si la política ya existe.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'stations'
          AND policyname = 'Public update stations'
    ) THEN
        CREATE POLICY "Public update stations" ON stations
          FOR UPDATE USING (TRUE)
          WITH CHECK (TRUE);
    END IF;
END
$$;
