-- 2.2 Carga de los precios oficiales de referencia vigentes desde 2026-11-01 (CREG, validados por Mario).
-- Generado con npm run reference-prices:import (data/reference-prices/2026-11.csv). Idempotente: ON CONFLICT.
-- Los meses siguientes se cargan con el mismo script (README, "Precios oficiales de referencia").
INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url) VALUES
  ('Bogotá', 'corriente', DATE '2026-11-01', 16331, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Bogotá', 'diesel', DATE '2026-11-01', 11616, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Medellín', 'corriente', DATE '2026-11-01', 16251, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Medellín', 'diesel', DATE '2026-11-01', 11641, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Cali', 'corriente', DATE '2026-11-01', 16339, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Cali', 'diesel', DATE '2026-11-01', 11763, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Barranquilla', 'corriente', DATE '2026-11-01', 15964, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Barranquilla', 'diesel', DATE '2026-11-01', 11291, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Cartagena', 'corriente', DATE '2026-11-01', 15921, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Cartagena', 'diesel', DATE '2026-11-01', 11256, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Montería', 'corriente', DATE '2026-11-01', 16171, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Montería', 'diesel', DATE '2026-11-01', 11506, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Bucaramanga', 'corriente', DATE '2026-11-01', 16089, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Bucaramanga', 'diesel', DATE '2026-11-01', 11364, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Villavicencio', 'corriente', DATE '2026-11-01', 16431, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Villavicencio', 'diesel', DATE '2026-11-01', 11716, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Pereira', 'corriente', DATE '2026-11-01', 16276, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Pereira', 'diesel', DATE '2026-11-01', 11703, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Manizales', 'corriente', DATE '2026-11-01', 16304, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Manizales', 'diesel', DATE '2026-11-01', 11688, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Ibagué', 'corriente', DATE '2026-11-01', 16245, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Ibagué', 'diesel', DATE '2026-11-01', 11607, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Pasto', 'corriente', DATE '2026-11-01', 13920, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Pasto', 'diesel', DATE '2026-11-01', 10529, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Cúcuta', 'corriente', DATE '2026-11-01', 14281, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'),
  ('Cúcuta', 'diesel', DATE '2026-11-01', 9486, 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/')
ON CONFLICT (city, fuel_type, valid_from) DO UPDATE SET price = EXCLUDED.price, source_url = EXCLUDED.source_url;
