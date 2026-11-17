-- 4.1 Barranquilla: desactiva los duplicados obvios. Son dos polígonos de OpenStreetMap de la
-- misma EDS (misma marca y misma dirección, a 67–80 m; ninguno tiene precios ni reportes).
-- No se borra nada: is_active = false y el mapa deja de mostrarlo. Se identifican por osm_id,
-- que es el mismo en todos los entornos (el id interno no). seed-colombia.js no toca is_active,
-- así que volver a importar no los reactiva.
-- Resguardo: solo se desactiva el duplicado si la estación que se queda sigue activa.
-- Idempotente: una segunda corrida no encuentra nada que cambiar.
-- El resto de la revisión (marcas mal escritas, direcciones genéricas, pares dudosos) es manual:
-- data/barranquilla-revision.csv y supabase/queries/barranquilla-calidad.sql.

UPDATE public.stations AS s
   SET is_active = false,
       updated_at = now()
  FROM (VALUES
         ('way/1267440493', 'way/684605088'),  -- Ecos - EDS Virgen del Carmen (Carrera 9), 67 m
         ('way/561590559',  'way/561590557'),  -- EDS Servicampestre, Petromil (Carrera 30), 80 m
         ('way/560138646',  'way/560138651')   -- "Gasolinera Barranquilla" → se queda "Primax" (Av. Circunvalar), 69 m
       ) AS d(duplicado, se_queda)
 WHERE s.osm_id = d.duplicado
   AND s.is_active IS TRUE
   AND EXISTS (SELECT 1 FROM public.stations k WHERE k.osm_id = d.se_queda AND k.is_active IS TRUE);
