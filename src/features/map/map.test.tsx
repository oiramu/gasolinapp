import { describe, expect, it } from 'vitest'
import { MAP_LABELS_TILE_URL, MAP_TILE_LOADING, MAP_TILE_SUBDOMAINS, MAP_TILE_URL } from '@/config/map'
import type { ZoneAverage } from '@/features/zones/api/types'
import { FUEL_TYPES } from '@/shared/domain/fuel'
import { FRESHNESS_OPACITY } from '@/shared/ui/freshness'
import { fuelPrice, station } from '@/test/fixtures/stations'
import { PIN_COLORS, stationPinModel, zonePinModel } from './model/pins'
import { createStationIcon, createUserLocationIcon, createZoneIcon } from './ui/mapIcons'

const html = (icon: { options: { html?: unknown } }) => String(icon.options.html)
// Los precios del fixture se confirmaron el 2026-11-13: 1 día antes de NOW es fresco
const NOW = Date.parse('2026-11-14T10:00:00Z')
const DAY = 86_400_000
const zone: ZoneAverage = {
  id: 'z1', name: 'Norte', city: 'Barranquilla', dept: 'Atlántico', code: null, lat: 11.01, lng: -74.81,
  avg_corriente: 15950, avg_extra: 18900, avg_diesel: 10900, avg_gnv: null, avg_urea: null, station_count: 8,
}

describe('stationPinModel', () => {
  const withPrices = station({ fuel_prices: [fuelPrice({ fuel_type: 'corriente', price: 15900 }), fuelPrice({ id: 'p2', fuel_type: 'extra', price: 18900 })] })

  it('muestra el precio del combustible elegido con su color y un punto por combustible', () => {
    expect(stationPinModel(withPrices, { fuelType: 'extra', isFavorite: false, now: NOW })).toMatchObject({
      label: '$18.900', color: FUEL_TYPES.extra.color, hasData: true, fuelDots: [FUEL_TYPES.corriente.color, FUEL_TYPES.extra.color],
    })
  })

  it('sin el combustible elegido muestra otro disponible en verde; sin precios, S/D en gris', () => {
    expect(stationPinModel(withPrices, { fuelType: 'diesel', isFavorite: false, now: NOW })).toMatchObject({ label: '$15.900', color: PIN_COLORS.active })
    expect(stationPinModel(station({ fuel_prices: [] }), { fuelType: 'corriente', isFavorite: true, now: NOW })).toMatchObject({
      label: 'S/D', color: PIN_COLORS.inactive, hasData: false, fuelDots: [], isFavorite: true,
    })
  })

  it('la opacidad sigue la frescura del precio que se muestra; sin precio es dudoso', () => {
    expect(stationPinModel(withPrices, { fuelType: 'corriente', isFavorite: false, now: NOW })).toMatchObject({ freshness: 'fresh', opacity: FRESHNESS_OPACITY.fresh })
    expect(stationPinModel(withPrices, { fuelType: 'corriente', isFavorite: false, now: NOW + 12 * DAY })).toMatchObject({ freshness: 'old', opacity: FRESHNESS_OPACITY.old })
    expect(stationPinModel(station({ fuel_prices: [] }), { fuelType: 'corriente', isFavorite: false, now: NOW })).toMatchObject({
      source: 'none', freshness: null, opacity: FRESHNESS_OPACITY.doubtful,
    })
  })

  it('sin precio comunitario fresco usa el oficial de su ciudad, con su propia opacidad', () => {
    const official = { price: 15964, validFrom: '2026-11-01' }
    expect(stationPinModel(station({ fuel_prices: [] }), { fuelType: 'corriente', isFavorite: false, now: NOW, official })).toMatchObject({
      label: '$15.964', source: 'reference', freshness: null, opacity: 0.9, color: FUEL_TYPES.corriente.color, hasData: true,
    })
    // Un comunitario fresco le gana al oficial
    expect(stationPinModel(station(), { fuelType: 'corriente', isFavorite: false, now: NOW, official })).toMatchObject({ label: '$15.900', source: 'community' })
  })

  it('con GNV elegido atenúa del todo las estaciones sin GNV', () => {
    expect(stationPinModel(station({ has_gnv: false }), { fuelType: 'gnv', isFavorite: false, now: NOW }).opacity).toBe(0.3)
    expect(stationPinModel(station({ has_gnv: true }), { fuelType: 'gnv', isFavorite: false, now: NOW })).toMatchObject({ opacity: FRESHNESS_OPACITY.fresh, hasGnv: true })
  })
})

describe('zonePinModel', () => {
  it('usa el promedio del combustible o, si falta, el de corriente', () => {
    expect(zonePinModel(zone, 'extra').label).toBe('$18.900')
    expect(zonePinModel(zone, 'gnv')).toMatchObject({ label: '$15.950', caption: `${zone.name} · ${String(zone.station_count)} est.` })
    expect(zonePinModel({ ...zone, avg_corriente: null }, 'urea').label).toBe('S/D')
  })
})

describe('mapIcons', () => {
  it('el ícono cambia con el combustible y el favorito, sin leer el store', () => {
    const s = station({ has_gnv: true })
    expect(html(createStationIcon(s, { fuelType: 'corriente', isFavorite: false, now: NOW }))).not.toContain('data-favorite')
    expect(html(createStationIcon(s, { fuelType: 'corriente', isFavorite: true, now: NOW }))).toContain('data-favorite')
    expect(html(createStationIcon(s, { fuelType: 'gnv', isFavorite: false, now: NOW }))).toContain('GAS')
  })

  it('con varios combustibles pinta un punto de color por cada uno', () => {
    const twoFuels = station({ fuel_prices: [fuelPrice({ fuel_type: 'corriente' }), fuelPrice({ id: 'p2', fuel_type: 'diesel', price: 11000 })] })
    const pin = html(createStationIcon(twoFuels, { fuelType: 'corriente', isFavorite: false, now: NOW }))
    expect(pin).toContain(`background:${FUEL_TYPES.diesel.color}`)
  })

  it('una estación sin precios se pinta apagada y con S/D', () => {
    const pin = html(createStationIcon(station({ fuel_prices: [] }), { fuelType: 'corriente', isFavorite: false, now: NOW }))
    expect(pin).toContain('S/D')
    expect(pin).toContain(`background:${PIN_COLORS.surfaceMuted}`)
  })

  it('cachea por objeto: la misma estación reutiliza el HTML; un objeto nuevo (precio corregido) lo vuelve a pintar', () => {
    const before = station({ fuel_prices: [fuelPrice({ price: 15900 })] })
    const corrected = { ...before, fuel_prices: [fuelPrice({ price: 15950 })] }
    const first = createStationIcon(before, { fuelType: 'corriente', isFavorite: false, now: NOW })
    expect(createStationIcon(before, { fuelType: 'corriente', isFavorite: false, now: NOW }).options.html).toBe(first.options.html)
    expect(html(createStationIcon(corrected, { fuelType: 'corriente', isFavorite: false, now: NOW }))).toContain('$15.950')
  })

  it('cuando el precio cambia de frescura, el mismo objeto se vuelve a pintar con otra opacidad', () => {
    const s1 = station()
    const fresh = html(createStationIcon(s1, { fuelType: 'corriente', isFavorite: false, now: NOW }))
    const old = html(createStationIcon(s1, { fuelType: 'corriente', isFavorite: false, now: NOW + 12 * DAY }))
    expect(fresh).toContain('opacity:1')
    expect(old).toContain(`opacity:${String(FRESHNESS_OPACITY.old)}`)
  })

  it('el pin oficial lleva borde punteado e insignia REF', () => {
    const pin = html(createStationIcon(station({ fuel_prices: [] }), { fuelType: 'diesel', isFavorite: false, now: NOW, official: { price: 11291, validFrom: '2026-11-01' } }))
    expect(pin).toContain('data-reference')
    expect(pin).toContain('dashed')
    expect(pin).toContain('$11.291')
  })

  it('pinta zonas por combustible y reutiliza el ícono de la ubicación', () => {
    expect(html(createZoneIcon(zone, 'diesel'))).toContain('$10.900')
    expect(createUserLocationIcon()).toBe(createUserLocationIcon())
  })
})

describe('teselas del mapa', () => {
  it('se reparten entre los dos dominios de Esri (sirven solo por HTTP/1.1: 6 conexiones por dominio)', () => {
    for (const url of [MAP_TILE_URL, MAP_LABELS_TILE_URL]) expect(url).toMatch(/^https:\/\/\{s\}\.arcgisonline\.com\//)
    expect(MAP_TILE_SUBDOMAINS).toEqual(['services', 'server'])
  })

  it('se cargan cuando el mapa se detiene, no en cada paso del arrastre ni del zoom', () => {
    expect(MAP_TILE_LOADING).toEqual({ updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 4 })
  })
})
