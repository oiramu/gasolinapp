-- S0.2: vigilancia de la fila SRID 4326 (job diario, alertas y restauración).
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(15);

-- ── Valor esperado ────────────────────────────────────────────────────────────
SELECT results_eq(
  $$SELECT md5(srtext), md5(proj4text) FROM public._expected_srid_4326()$$,
  $$VALUES ('b15bafbdc1d2d38b9f1e31bd95f3082e', '723f5f14abf4ef619865a2c068974932')$$,
  'el valor esperado tiene las huellas medidas en producción (PostGIS 3.3.7)'
);
SELECT ok(public.srid_4326_intact(), 'la fila 4326 de una base limpia está intacta');

-- ── Job programado ────────────────────────────────────────────────────────────
SELECT results_eq(
  $$SELECT schedule, command, active FROM cron.job WHERE jobname = 'check_srid_4326'$$,
  $$VALUES ('0 11 * * *'::text, 'SELECT public.check_srid_4326()'::text, true)$$,
  'el job diario está programado una sola vez (06:00 en Bogotá)'
);

-- ── Privilegios ───────────────────────────────────────────────────────────────
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ops_alerts'::regclass), 'RLS activa en ops_alerts');
SELECT ok(
  NOT has_table_privilege('anon', 'public.ops_alerts', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.ops_alerts', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE'),
  'el cliente no ve ni toca ops_alerts'
);
SELECT ok(
  has_function_privilege('anon', 'public.srid_4326_intact()', 'execute')
  AND has_function_privilege('authenticated', 'public.srid_4326_intact()', 'execute'),
  'el cliente puede preguntar si la fila está intacta (solo lectura)'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.check_srid_4326()', 'execute')
  AND NOT has_function_privilege('anon', 'public.restore_srid_4326()', 'execute')
  AND NOT has_function_privilege('anon', 'public._expected_srid_4326()', 'execute')
  AND NOT has_function_privilege('authenticated', 'public.restore_srid_4326()', 'execute'),
  'abuso: el cliente no puede disparar el chequeo, restaurar ni leer el helper'
);
SELECT throws_ok(
  $$SET LOCAL ROLE anon; SELECT public.restore_srid_4326()$$,
  '42501', NULL, 'abuso: anon no restaura'
);
RESET ROLE;

-- ── Caso sano: el chequeo no deja alertas ─────────────────────────────────────
SELECT ok(public.check_srid_4326(), 'chequeo con la fila intacta: true');
SELECT is((SELECT count(*)::int FROM public.ops_alerts), 0, 'sin alertas cuando todo está bien');

-- ── Fila alterada: alerta y restauración ──────────────────────────────────────
UPDATE public.spatial_ref_sys SET srtext = 'alterado' WHERE srid = 4326;
SELECT ok(NOT public.check_srid_4326(), 'chequeo con la fila alterada: false');
SELECT results_eq(
  $$SELECT check_name, detail->>'md5_srtext' FROM public.ops_alerts$$,
  $$VALUES ('srid_4326'::text, md5('alterado'))$$,
  'la alerta registra qué encontró'
);

DELETE FROM public.spatial_ref_sys WHERE srid = 4326;
SELECT ok(NOT public.check_srid_4326(), 'chequeo con la fila borrada: false');
SELECT is(
  (SELECT detail->>'missing' FROM public.ops_alerts ORDER BY id DESC LIMIT 1),
  'true',
  'la alerta dice que la fila falta'
);

SELECT public.restore_srid_4326();
SELECT ok(public.srid_4326_intact(), 'la restauración deja la fila 4326 intacta');

SELECT * FROM finish();
ROLLBACK;
