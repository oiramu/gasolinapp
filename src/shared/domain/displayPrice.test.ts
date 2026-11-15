import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cityKey } from './cities'
import { formatReferenceMonth, resolveDisplayPrice } from './displayPrice'

const NOW = Date.parse('2026-11-16T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const official = { price: 15964, validFrom: '2026-11-01' }

describe('resolveDisplayPrice', () => {
  it('manda el precio comunitario fresco o reciente', () => {
    expect(resolveDisplayPrice({ price: 15900, confirmedAt: daysAgo(1) }, official, NOW)).toEqual({ source: 'community', price: 15900, freshness: 'fresh' })
    expect(resolveDisplayPrice({ price: 15900, confirmedAt: daysAgo(5) }, official, NOW)).toEqual({ source: 'community', price: 15900, freshness: 'recent' })
  })

  it('si el comunitario está viejo o no hay, usa el oficial', () => {
    expect(resolveDisplayPrice({ price: 15500, confirmedAt: daysAgo(15) }, official, NOW)).toEqual({ source: 'reference', price: 15964, validFrom: '2026-11-01' })
    expect(resolveDisplayPrice(undefined, official, NOW)).toEqual({ source: 'reference', price: 15964, validFrom: '2026-11-01' })
  })

  it('sin oficial, muestra el comunitario aunque esté viejo; sin ninguno, none', () => {
    expect(resolveDisplayPrice({ price: 15500, confirmedAt: daysAgo(40) }, undefined, NOW)).toEqual({ source: 'community', price: 15500, freshness: 'doubtful' })
    expect(resolveDisplayPrice(undefined, undefined, NOW)).toEqual({ source: 'none' })
  })
})

describe('formatReferenceMonth', () => {
  it('muestra mes corto y año', () => {
    expect(formatReferenceMonth('2026-11-01')).toBe('nov 2026')
    expect(formatReferenceMonth('2027-01-01')).toBe('ene 2027')
    expect(formatReferenceMonth('2027-13-01')).toBe('13 2027')
  })
})

describe('ciudades con precio oficial (CREG, nov 2026)', () => {
  // Ciudades de public.zones en producción al 2026-11-15
  const ZONE_CITIES = [
    'Bogotá', 'Cali', 'Medellín', 'Barranquilla', 'Bucaramanga', 'Cartagena', 'Pereira', 'Armenia', 'Cúcuta', 'Montería',
    'Sincelejo', 'Manizales', 'Pasto', 'Santa Marta', 'Ibagué', 'Villavicencio', 'Popayán', 'Tunja', 'Riohacha', 'Neiva',
    'Yopal', 'Valledupar', 'Buenaventura', 'Caldas', 'Bello',
  ]
  const csv = readFileSync('data/reference-prices/2026-11.csv', 'utf8')
  const officialCities = new Set(csv.split('\n').slice(1).filter(Boolean).map((line) => cityKey(line.split(',')[0] ?? '')))
  const withoutOfficial = ZONE_CITIES.filter((city) => !officialCities.has(cityKey(city)))

  it('Barranquilla tiene precio oficial', () => {
    expect(officialCities.has(cityKey('Barranquilla'))).toBe(true)
  })

  it('las ciudades sin precio oficial quedan anotadas (muestran "Sin precio" si no hay reporte)', () => {
    expect(withoutOfficial).toEqual([
      'Armenia', 'Sincelejo', 'Santa Marta', 'Popayán', 'Tunja', 'Riohacha', 'Neiva', 'Yopal', 'Valledupar', 'Buenaventura', 'Caldas', 'Bello',
    ])
  })

  it('cityKey compara sin tildes, mayúsculas ni espacios', () => {
    expect(cityKey('  BOGOTÁ ')).toBe(cityKey('Bogotá'))
    expect(cityKey('Cúcuta')).toBe('cucuta')
  })
})
