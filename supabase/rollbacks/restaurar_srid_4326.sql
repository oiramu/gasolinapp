-- Restaura la fila SRID 4326 de PostGIS (WGS 84) si alguien la borró o la alteró.
-- NO está en supabase/migrations: se corre a mano, como postgres, cuando ops_alerts o
-- security:check avisan que la fila no está intacta. Idempotente.
--
-- El valor esperado vive en una sola parte: public._expected_srid_4326()
-- (migración 20261116000000_vigilar_srid_4326). Esto solo lo aplica y lo verifica.

SELECT public.restore_srid_4326();

-- Debe devolver true
SELECT public.srid_4326_intact() AS srid_4326_intacto;
