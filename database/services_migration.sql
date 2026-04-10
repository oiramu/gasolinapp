-- Eliminar tablas relacionales viejas si llegaron a ser creadas
DROP TABLE IF EXISTS station_services CASCADE;
DROP TABLE IF EXISTS station_service_types CASCADE;
DROP TABLE IF EXISTS brand_default_services CASCADE;

-- Columnas booleanas directas en stations para servicios
ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS svc_montallantas BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svc_cambio_aceite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svc_serviteca BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svc_tienda BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svc_lavadero BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svc_bano BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svc_cafe BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svc_electrico BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svc_atm BOOLEAN DEFAULT false;

-- Eliminar columnas obsoletas si existen (seguridad por si hubo testeo viejo)
ALTER TABLE stations
  DROP COLUMN IF EXISTS svc_aire,
  DROP COLUMN IF EXISTS svc_balanceo,
  DROP COLUMN IF EXISTS svc_alineacion,
  DROP COLUMN IF EXISTS svc_cambio_llantas;

-- Eliminar columna e índice antiguos si llegaron a ser creados
ALTER TABLE stations DROP COLUMN IF EXISTS atm_franquicias;
DROP INDEX IF EXISTS idx_stations_atm;
