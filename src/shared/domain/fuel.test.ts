import { describe, expect, it } from 'vitest'
import {
  FUEL_ORDER,
  FUEL_TYPES,
  getFuelUnit,
  getFuelUnitLabel,
  getLatestPrices,
  hasReportedPrices,
  isFuelType,
  isPriceOutlier,
} from './fuel'

const price = (fuel_type: string, created_at: string | null, is_active: boolean | null = true) => ({
  fuel_type,
  created_at,
  is_active,
})

describe('FUEL_TYPES y FUEL_ORDER', () => {
  it('ordena los cinco combustibles sin claves legadas', () => {
    expect(FUEL_ORDER).toEqual(['corriente', 'extra', 'diesel', 'gnv', 'urea'])
    expect([...FUEL_ORDER].sort()).toEqual(Object.keys(FUEL_TYPES).sort())
    expect(FUEL_ORDER).not.toContain('super')
  })
})

describe('isFuelType', () => {
  it.each(['corriente', 'extra', 'diesel', 'urea', 'gnv'])('acepta %s', (fuel) => {
    expect(isFuelType(fuel)).toBe(true)
  })

  it.each(['super', 'toString', ''])('rechaza %j', (fuel) => {
    expect(isFuelType(fuel)).toBe(false)
  })
})

describe('unidades', () => {
  it('mide el GNV en m³ y los líquidos en galones', () => {
    expect(getFuelUnit('gnv')).toBe('m3')
    expect(getFuelUnit('corriente')).toBe('gallon')
    expect(getFuelUnitLabel('gnv')).toBe('m³')
    expect(getFuelUnitLabel('diesel')).toBe('galón')
  })

  it('usa galón para un combustible desconocido', () => {
    expect(getFuelUnit('super')).toBe('gallon')
    expect(getFuelUnitLabel('super')).toBe('galón')
  })
})

describe('isPriceOutlier', () => {
  it('acepta los bordes del rango', () => {
    expect(isPriceOutlier(12000, 'corriente')).toBe(false)
    expect(isPriceOutlier(20000, 'corriente')).toBe(false)
  })

  it('marca precios por fuera del rango', () => {
    expect(isPriceOutlier(11999, 'corriente')).toBe(true)
    expect(isPriceOutlier(5001, 'gnv')).toBe(true)
  })

  it('no marca combustibles desconocidos', () => {
    expect(isPriceOutlier(1, 'super')).toBe(false)
  })
})

describe('getLatestPrices', () => {
  it('devuelve el precio activo más reciente por combustible', () => {
    const old = price('extra', '2026-11-01T10:00:00Z')
    const recent = price('extra', '2026-11-02T10:00:00Z')
    const diesel = price('diesel', '2026-11-01T10:00:00Z')
    expect(getLatestPrices([old, recent, diesel])).toEqual({ extra: recent, diesel })
  })

  it('ignora los precios inactivos aunque sean más nuevos', () => {
    const active = price('extra', '2026-11-01T10:00:00Z')
    const inactive = price('extra', '2026-11-05T10:00:00Z', false)
    const unknown = price('extra', '2026-11-06T10:00:00Z', null)
    expect(getLatestPrices([active, inactive, unknown])).toEqual({ extra: active })
  })

  it('en empate conserva el primero', () => {
    const first = price('extra', '2026-11-01T10:00:00Z')
    const second = price('extra', '2026-11-01T10:00:00Z')
    expect(getLatestPrices([first, second]).extra).toBe(first)
  })

  it('trata created_at nulo como el más antiguo', () => {
    const undated = price('extra', null)
    const dated = price('extra', '2026-11-01T10:00:00Z')
    expect(getLatestPrices([undated, dated]).extra).toBe(dated)
    expect(getLatestPrices([dated, undated]).extra).toBe(dated)
  })

  it('sin precios devuelve un objeto vacío', () => {
    expect(getLatestPrices()).toEqual({})
  })
})

describe('hasReportedPrices', () => {
  it('es true con al menos un precio activo', () => {
    expect(hasReportedPrices({ fuel_prices: [price('extra', null, false), price('gnv', null)] })).toBe(true)
  })

  it('es false sin precios activos o sin lista', () => {
    expect(hasReportedPrices({ fuel_prices: [price('extra', null, false)] })).toBe(false)
    expect(hasReportedPrices({ fuel_prices: null })).toBe(false)
    expect(hasReportedPrices({})).toBe(false)
  })
})
