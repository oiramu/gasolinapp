-- 4.1 Calidad de las estaciones de Barranquilla. Solo lectura (SQL Editor o execute_sql).
-- Estaciones activas, sin las de prueba, cuya zona es de Barranquilla.
-- Ojo: OSM suele tener dos polígonos por estación (marquesina y edificio) y sus centros quedan
-- a 60–80 m. Por eso un duplicado se busca por marca + dirección hasta 150 m, no solo por distancia.

-- ── 1. Posibles duplicados ────────────────────────────────────────────────────
-- (a) cualquier par a menos de 60 m; (b) misma marca (normalizada) a menos de 150 m.
-- "obvio" = misma marca y misma dirección: lo corrige la migración barranquilla_duplicados.
WITH bq AS (
  SELECT s.id, s.name, s.brand, s.address, s.osm_id, s.location,
         split_part(lower(translate(btrim(s.brand), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou')), ' ', 1) AS marca_norm,
         (SELECT count(*) FROM public.fuel_prices p WHERE p.station_id = s.id) AS precios,
         (SELECT count(*) FROM public.reports r WHERE r.station_id = s.id) AS reportes
    FROM public.stations s
    JOIN public.zones z ON z.id = s.zone_id
   WHERE s.is_active IS TRUE AND s.is_test IS FALSE AND lower(z.city) = 'barranquilla'
)
SELECT round(ST_Distance(a.location, b.location)::numeric, 1) AS metros,
       CASE WHEN a.marca_norm = b.marca_norm AND lower(btrim(a.address)) = lower(btrim(b.address)) THEN 'obvio' ELSE 'revisar' END AS tipo,
       a.osm_id AS a_osm, a.name AS a_nombre, a.brand AS a_marca, a.address AS a_dir, a.precios AS a_precios, a.reportes AS a_reportes,
       b.osm_id AS b_osm, b.name AS b_nombre, b.brand AS b_marca, b.address AS b_dir, b.precios AS b_precios, b.reportes AS b_reportes
  FROM bq a
  JOIN bq b ON a.id < b.id AND ST_DWithin(a.location, b.location, 150)
 WHERE ST_DWithin(a.location, b.location, 60) OR a.marca_norm = b.marca_norm
 ORDER BY metros;

-- ── 2. Sin marca, o con la marca mal escrita ──────────────────────────────────
-- Marcas que no son una de las conocidas (mayúsculas, nombre de la EDS en la marca, typos).
WITH conocidas(marca) AS (
  VALUES ('Terpel'), ('Petromil'), ('Texaco'), ('Primax'), ('Ecos'), ('Puma'), ('Gazel'), ('Biomax'), ('Esso'),
         ('Zeus'), ('Shell'), ('Mobil'), ('Petrobras'), ('Brío'), ('Mineroil'), ('Distracom'), ('Arcas')
)
SELECT s.osm_id, s.name AS nombre, s.brand AS marca, s.address AS direccion
  FROM public.stations s
  JOIN public.zones z ON z.id = s.zone_id
 WHERE s.is_active IS TRUE AND s.is_test IS FALSE AND lower(z.city) = 'barranquilla'
   AND s.brand NOT IN (SELECT marca FROM conocidas)
 ORDER BY s.brand, s.name;

-- ── 3. Sin dirección útil ─────────────────────────────────────────────────────
-- Vacía o igual al nombre de la ciudad.
SELECT s.osm_id, s.name AS nombre, s.brand AS marca, s.address AS direccion
  FROM public.stations s
  JOIN public.zones z ON z.id = s.zone_id
 WHERE s.is_active IS TRUE AND s.is_test IS FALSE AND lower(z.city) = 'barranquilla'
   AND (btrim(coalesce(s.address, '')) = '' OR lower(btrim(s.address)) = lower(z.city))
 ORDER BY s.brand, s.name;
