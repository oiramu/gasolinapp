import { describe, expect, it, vi } from 'vitest'
import * as fuel from './fuel'
import { distanceMeters, formatDistance, getBestStation, NEAR_RADIUS_METERS, type Bounds } from './geo'

const BARRANQUILLA = { lat: 10.9878, lng: -74.7889 }
const SANTA_MARTA = { lat: 11.2408, lng: -74.199 }

const everywhere: Bounds = { contains: () => true }

const station = (id: string, [lat, lng]: [number, number], prices: Record<string, number>) => ({
  id,
  lat,
  lng,
  fuel_prices: Object.entries(prices).map(([fuel_type, price]) => ({
    fuel_type,
    price,
    is_active: true,
    created_at: '2026-11-13T10:00:00Z',
  })),
})

describe('distanceMeters', () => {
  it('es cero para el mismo punto', () => {
    expect(distanceMeters(BARRANQUILLA, BARRANQUILLA)).toBe(0)
  })

  it('mide Barranquilla–Santa Marta en unos 70 km, en ambos sentidos', () => {
    const meters = distanceMeters(BARRANQUILLA, SANTA_MARTA)
    expect(meters).toBeGreaterThan(69_000)
    expect(meters).toBeLessThan(72_000)
    expect(distanceMeters(SANTA_MARTA, BARRANQUILLA)).toBeCloseTo(meters, 6)
  })

  it('expone el radio del filtro "cerca"', () => {
    expect(NEAR_RADIUS_METERS).toBe(15_000)
  })
})

describe('formatDistance', () => {
  it.each([
    [0, '0m'],
    [849.6, '850m'],
    [999, '999m'],
    [1000, '1.0km'],
    [2345, '2.3km'],
  ])('%s → %s', (meters, expected) => {
    expect(formatDistance(meters)).toBe(expected)
  })

  it.each([null, undefined, Number.NaN])('%s → null', (meters) => {
    expect(formatDistance(meters)).toBeNull()
  })
})

describe('getBestStation', () => {
  const cheap = station('cheap', [10.98, -74.8], { corriente: 15000 })
  const expensive = station('expensive', [10.99, -74.81], { corriente: 16000 })
  const dieselOnly = station('diesel', [10.97, -74.79], { diesel: 9000 })

  it('elige el precio más bajo del combustible pedido', () => {
    expect(getBestStation([expensive, dieselOnly, cheap], everywhere, 'corriente')).toBe(cheap)
  })

  it('solo considera las estaciones dentro del área visible', () => {
    const onlyExpensive: Bounds = { contains: ([lat]) => lat === expensive.lat }
    expect(getBestStation([cheap, expensive], onlyExpensive, 'corriente')).toBe(expensive)
  })

  it('descarta estaciones sin coordenadas', () => {
    const noLat = station('no-lat', [0, -74.8], { corriente: 1 })
    const noLng = station('no-lng', [10.98, 0], { corriente: 1 })
    expect(getBestStation([noLat, noLng, expensive], everywhere, 'corriente')).toBe(expensive)
  })

  it('en empate gana la primera', () => {
    const twin = station('twin', [10.95, -74.8], { corriente: 15000 })
    expect(getBestStation([cheap, twin], everywhere, 'corriente')).toBe(cheap)
  })

  it('devuelve null sin área, sin estaciones o sin precios del combustible', () => {
    expect(getBestStation([cheap], null, 'corriente')).toBeNull()
    expect(getBestStation([cheap], undefined, 'corriente')).toBeNull()
    expect(getBestStation([], everywhere, 'corriente')).toBeNull()
    expect(getBestStation([dieselOnly, { ...cheap, fuel_prices: null }], everywhere, 'corriente')).toBeNull()
  })

  it('resuelve el precio vigente una sola vez por estación', () => {
    const spy = vi.spyOn(fuel, 'getLatestPrices')
    getBestStation([cheap, expensive, dieselOnly], everywhere, 'corriente')
    expect(spy).toHaveBeenCalledTimes(3)
  })
})
