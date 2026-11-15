import { describe, expect, it } from 'vitest'
import { FUEL_ORDER, FUEL_PRICE_RANGES, FUEL_TYPES } from './fuel'
import { REPORT_CONTENT_MAX_LENGTH } from './reports'

/**
 * Las reglas que valen en TS y en SQL tienen una sola fuente: shared/domain. Este test genera
 * el pgTAP que verifica que la base aplica los mismos valores (rangos, unidades y largo del
 * comentario). Si cambias una regla: corre `npx vitest -u` y escribe la migración que la aplica.
 */
const PGTAP_FILE = '../../../supabase/tests/database/003_reglas_compartidas.test.sql'
const GENERATED_BY = 'src/shared/domain/sharedRules.db.test.ts'

const USER = '00000000-0000-4000-8000-0000000000c3'
const STATION = '00000000-0000-0000-0000-0000000000c3'
const MAX = String(REPORT_CONTENT_MAX_LENGTH)
const OVER = String(REPORT_CONTENT_MAX_LENGTH + 1)

function rangeRows(): string {
  return FUEL_ORDER.map((fuel) => {
    const { min, max } = FUEL_PRICE_RANGES[fuel]
    return `  ('${fuel}', ${String(min)}, ${String(max)}, '${FUEL_TYPES[fuel].unit}')`
  }).join(',\n')
}

function sharedRulesPgTap(): string {
  return `-- GENERADO por ${GENERATED_BY} desde shared/domain. No lo edites: corre \`npx vitest -u\`.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(4);

SELECT set_eq(
  $$SELECT fuel_type, min_price, max_price, price_unit::text FROM public.fuel_price_ranges$$,
  $$VALUES
${rangeRows()}$$,
  'fuel_price_ranges coincide con FUEL_PRICE_RANGES y las unidades de fuel.ts'
);

INSERT INTO auth.users (id, aud, role, is_anonymous) VALUES ('${USER}', 'authenticated', 'authenticated', true);
INSERT INTO public.stations (id, name, brand, lat, lng) VALUES ('${STATION}', 'EDS reglas', 'Terpel', 10.98, -74.80);
SELECT set_config('request.jwt.claims', '{"sub":"${USER}","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.add_report('${STATION}', 'comment', repeat('x', ${MAX}))$$,
  'add_report acepta REPORT_CONTENT_MAX_LENGTH (${MAX}) caracteres'
);
SELECT throws_ok(
  $$SELECT public.add_report('${STATION}', 'comment', repeat('x', ${OVER}))$$,
  '22023', 'INVALID_CONTENT', 'add_report rechaza ${OVER} caracteres'
);
SELECT throws_ok(
  $$SELECT public.report_price('${STATION}', 'corriente', ${String(FUEL_PRICE_RANGES.corriente.min)}, repeat('x', ${OVER}))$$,
  '22023', 'INVALID_COMMENT', 'report_price rechaza un comentario de ${OVER} caracteres'
);

SELECT * FROM finish();
ROLLBACK;
`
}

describe('reglas compartidas TS ↔ SQL', () => {
  it('el pgTAP está generado desde shared/domain', async () => {
    await expect(sharedRulesPgTap()).toMatchFileSnapshot(PGTAP_FILE)
  })
})
