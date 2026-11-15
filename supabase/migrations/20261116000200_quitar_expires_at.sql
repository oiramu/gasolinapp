-- 2.1 Frescura (contraer): se elimina expires_at.
-- Aplicar después de 20261115054737_frescura_confirmed_at: desde ahí report_price no la toca.
-- Ni la app ni las vistas la leen (verificado el 2026-11-15). Idempotente.

ALTER TABLE public.fuel_prices DROP COLUMN IF EXISTS expires_at;
