import { describe, expect, it } from 'vitest'
import { FUEL_ORDER, FUEL_PRICE_RANGES, FUEL_TYPES } from './fuel'

/**
 * fuel.ts es la fuente única de los rangos y unidades. Este test genera el pgTAP que verifica
 * que `public.fuel_price_ranges` (la tabla que usa `report_price`) tenga los mismos valores.
 * Si cambias un rango: corre `npx vitest -u` y escribe una migración con el valor nuevo.
 */
const PGTAP_FILE = '../../../supabase/tests/database/003_fuel_price_ranges.test.sql'

function rangesPgTap(): string {
  const rows = FUEL_ORDER.map((fuel) => {
    const { min, max } = FUEL_PRICE_RANGES[fuel]
    return `  ('${fuel}', ${String(min)}, ${String(max)}, '${FUEL_TYPES[fuel].unit}')`
  })
  return [
    '-- GENERADO por src/shared/domain/fuelPriceRanges.db.test.ts desde fuel.ts. No lo edites: corre `npx vitest -u`.',
    'BEGIN;',
    '',
    'CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;',
    '',
    'SELECT plan(1);',
    '',
    'SELECT set_eq(',
    "  $$SELECT fuel_type, min_price, max_price, price_unit::text FROM public.fuel_price_ranges$$,",
    `  $$VALUES\n${rows.join(',\n')}$$,`,
    "  'fuel_price_ranges coincide con FUEL_PRICE_RANGES y las unidades de fuel.ts'",
    ');',
    '',
    'SELECT * FROM finish();',
    'ROLLBACK;',
    '',
  ].join('\n')
}

describe('fuel_price_ranges', () => {
  it('el pgTAP de rangos está generado desde fuel.ts', async () => {
    await expect(rangesPgTap()).toMatchFileSnapshot(PGTAP_FILE)
  })
})
