import { describe, expect, it } from 'vitest'
import { parseReferenceCsv, toReferenceSql, validateOptions } from './referencePrices'

const CSV = 'city,fuel_type,price\nBarranquilla,corriente,15.964\n\nBarranquilla, diesel ,11291\n'

describe('parseReferenceCsv', () => {
  it('lee filas con punto de miles o sin él, e ignora líneas vacías', () => {
    expect(parseReferenceCsv(CSV)).toEqual({
      ok: true,
      value: [
        { city: 'Barranquilla', fuelType: 'corriente', price: 15964 },
        { city: 'Barranquilla', fuelType: 'diesel', price: 11291 },
      ],
    })
  })

  it('junta todos los errores con su línea', () => {
    const result = parseReferenceCsv('city,fuel_type,price\nCali,corriente,159.640\nCali,super,15000\nCali\n,diesel,11000\nCali,diesel,11.763\nCali,diesel,11.763')
    expect(result).toEqual({
      ok: false,
      errors: [
        'línea 2: precio fuera de rango para corriente: "159.640"',
        'línea 3: combustible desconocido "super"',
        'línea 4: se esperaban city,fuel_type,price',
        'línea 5: se esperaban city,fuel_type,price',
        'fila repetida: Cali/diesel',
      ],
    })
  })

  it('exige el encabezado y al menos una fila', () => {
    expect(parseReferenceCsv('ciudad,combustible,precio\n')).toEqual({ ok: false, errors: ['la primera línea debe ser "city,fuel_type,price"'] })
    expect(parseReferenceCsv('city,fuel_type,price\n')).toEqual({ ok: false, errors: ['el CSV no tiene filas'] })
    expect(parseReferenceCsv('city,fuel_type,price\nCali,corriente,abc').ok).toBe(false)
  })
})

describe('validateOptions', () => {
  it('acepta una fecha real y una fuente https', () => {
    expect(validateOptions('2026-11-01', 'https://creg.gov.co/x')).toEqual({ ok: true, value: { validFrom: '2026-11-01', sourceUrl: 'https://creg.gov.co/x' } })
  })

  it('rechaza fechas imposibles o ausentes y fuentes sin https', () => {
    expect(validateOptions('2026-02-30', 'http://x')).toEqual({ ok: false, errors: ['--valid-from debe ser una fecha YYYY-MM-DD', '--source debe ser una URL https://'] })
    expect(validateOptions(undefined, undefined).ok).toBe(false)
  })
})

describe('toReferenceSql', () => {
  it('genera un INSERT idempotente y escapa comillas', () => {
    const sql = toReferenceSql([{ city: "O'Hara", fuelType: 'corriente', price: 15964 }], { validFrom: '2026-11-01', sourceUrl: 'https://creg.gov.co/x' })
    expect(sql).toContain("('O''Hara', 'corriente', DATE '2026-11-01', 15964, 'https://creg.gov.co/x')")
    expect(sql).toContain('ON CONFLICT (city, fuel_type, valid_from) DO UPDATE SET price = EXCLUDED.price, source_url = EXCLUDED.source_url;')
    expect(sql).toMatch(/^-- Precios oficiales de referencia vigentes desde 2026-11-01/)
  })
})
