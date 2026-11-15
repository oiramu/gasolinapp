-- 3.4 Métricas de producto. Solo lectura: se corren en el SQL Editor (o con execute_sql) cuando se quiera.
-- Fechas y semanas en hora de Bogotá. Las estaciones de prueba (is_test) no cuentan.
-- Los eventos de navegadores automatizados (HeadlessChrome: capturas de cada deploy) tampoco: la app ya
-- no los envía desde el 2026-11-15, y los anteriores se excluyen por el user-agent de su sesión.

-- ── 1. Métrica norte ──────────────────────────────────────────────────────────
-- % de estaciones activas de Barranquilla con al menos un precio comunitario confirmado en los últimos 7 días.
WITH barranquilla AS (
  SELECT s.id
    FROM public.stations s
    JOIN public.zones z ON z.id = s.zone_id
   WHERE s.is_active IS TRUE
     AND s.is_test IS FALSE
     AND lower(z.city) = 'barranquilla'
),
con_precio AS (
  SELECT DISTINCT p.station_id
    FROM public.fuel_prices p
   WHERE p.is_active IS TRUE
     AND p.confirmed_at > now() - interval '7 days'
)
SELECT count(*)                                                                AS estaciones,
       count(c.station_id)                                                     AS con_precio_7d,
       round(100.0 * count(c.station_id) / nullif(count(*), 0), 1)             AS pct_con_precio_7d
  FROM barranquilla b
  LEFT JOIN con_precio c ON c.station_id = b.id;

-- ── 2. Usuarios activos por semana (últimas 8) ────────────────────────────────
-- Un usuario activo es un uid (anónimo) con al menos un evento en la semana.
WITH bots AS (SELECT DISTINCT user_id FROM auth.sessions WHERE user_agent ILIKE '%HeadlessChrome%')
SELECT date_trunc('week', e.created_at AT TIME ZONE 'America/Bogota')::date AS semana,
       count(DISTINCT e.user_id)                                            AS usuarios_activos
  FROM public.events e
 WHERE e.created_at > now() - interval '8 weeks'
   AND e.user_id NOT IN (SELECT user_id FROM bots)
 GROUP BY 1
 ORDER BY 1 DESC;

-- ── 3. Reportes y confirmaciones por día (últimos 30) ─────────────────────────
-- Salen de las tablas (fuente de verdad), no de los eventos.
WITH dias AS (
  SELECT generate_series(
           (now() AT TIME ZONE 'America/Bogota')::date - 29,
           (now() AT TIME ZONE 'America/Bogota')::date,
           interval '1 day')::date AS dia
),
reportes AS (
  SELECT (p.created_at AT TIME ZONE 'America/Bogota')::date AS dia, count(*) AS n
    FROM public.fuel_prices p
    JOIN public.stations s ON s.id = p.station_id AND s.is_test IS FALSE
   WHERE p.created_at > now() - interval '31 days'
   GROUP BY 1
),
confirmaciones AS (
  SELECT c.confirmed_on AS dia, count(*) AS n
    FROM public.price_confirmations c
   WHERE c.confirmed_on > (now() AT TIME ZONE 'America/Bogota')::date - 31
   GROUP BY 1
)
SELECT d.dia,
       coalesce(r.n, 0) AS reportes,
       coalesce(c.n, 0) AS confirmaciones
  FROM dias d
  LEFT JOIN reportes r       ON r.dia = d.dia
  LEFT JOIN confirmaciones c ON c.dia = d.dia
 ORDER BY d.dia DESC;

-- ── 4. Conversión de abrir una estación a confirmar o reportar (últimos 30 días) ──
-- Por día: usuarios que abrieron alguna estación y, de ellos, cuántos confirmaron o reportaron ese mismo día.
WITH bots AS (SELECT DISTINCT user_id FROM auth.sessions WHERE user_agent ILIKE '%HeadlessChrome%'),
por_usuario_y_dia AS (
  SELECT (e.created_at AT TIME ZONE 'America/Bogota')::date                      AS dia,
         e.user_id,
         bool_or(e.name = 'station_open')                                        AS abrio,
         bool_or(e.name IN ('price_confirmed', 'price_reported'))                AS aporto
    FROM public.events e
   WHERE e.created_at > now() - interval '30 days'
     AND e.user_id NOT IN (SELECT user_id FROM bots)
   GROUP BY 1, 2
)
SELECT dia,
       count(*) FILTER (WHERE abrio)                                             AS abrieron_estacion,
       count(*) FILTER (WHERE abrio AND aporto)                                  AS confirmaron_o_reportaron,
       round(100.0 * count(*) FILTER (WHERE abrio AND aporto)
                   / nullif(count(*) FILTER (WHERE abrio), 0), 1)                AS pct_conversion
  FROM por_usuario_y_dia
 GROUP BY dia
 ORDER BY dia DESC;
